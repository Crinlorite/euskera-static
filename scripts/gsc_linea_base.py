#!/usr/bin/env python3
"""Línea base de Search Console para euskera.crintech.pro (query × página).

Para qué: medir el efecto del hreflang y las descripciones (plan
docs/superpowers/plans/2026-09-07-seo-hreflang-descripciones-android.md).
Métrica principal: % de impresiones de consultas en castellano que Google
sirve con una página que NO es /es/ (7-sep-2026: 59 %).

Uso:  GSC_SA_JSON=/ruta/clave-cuenta-servicio.json python3 scripts/gsc_linea_base.py [desde] [hasta]
      --palabras  cruza lo que la gente busca con lo que el hiztegia ya cubre
      (por defecto: los 28 días que terminan hace 2 días; GSC va con ~2 días de retraso)
Salida: resumen por pantalla + filas crudas en JSON (ruta en GSC_SALIDA, por defecto ./gsc-filas.json).
Sin dependencias: el JWT RS256 se firma con openssl.
"""
import base64, collections, datetime as dt, json, os, re, subprocess, sys, tempfile, urllib.parse, urllib.request

SA = os.environ.get("GSC_SA_JSON", "/root/.claude/gsc-sa.local.json")
PROP = os.environ.get("GSC_PROPIEDAD", "sc-domain:crintech.pro")
HOST = "euskera.crintech.pro"
SALIDA = os.environ.get("GSC_SALIDA", "gsc-filas.json")

def token():
    sa = json.load(open(SA))
    b64 = lambda d: base64.urlsafe_b64encode(d).rstrip(b"=").decode()
    ahora = int(dt.datetime.now(dt.timezone.utc).timestamp())
    cab = b64(json.dumps({"alg": "RS256", "typ": "JWT"}).encode())
    cuerpo = b64(json.dumps({"iss": sa["client_email"], "scope": "https://www.googleapis.com/auth/webmasters.readonly",
                             "aud": sa["token_uri"], "iat": ahora, "exp": ahora + 3600}).encode())
    with tempfile.NamedTemporaryFile("w", suffix=".pem", delete=False) as f:
        f.write(sa["private_key"]); pem = f.name
    try:
        firma = subprocess.run(["openssl", "dgst", "-sha256", "-sign", pem], input=f"{cab}.{cuerpo}".encode(),
                               capture_output=True, check=True).stdout
    finally:
        os.unlink(pem)
    datos = urllib.parse.urlencode({"grant_type": "urn:ietf:params:oauth:grant-type:jwt-bearer",
                                    "assertion": f"{cab}.{cuerpo}.{b64(firma)}"}).encode()
    return json.load(urllib.request.urlopen(sa["token_uri"], data=datos, timeout=30))["access_token"]

def filas(desde, hasta):
    cuerpo = {"startDate": desde, "endDate": hasta, "dimensions": ["query", "page"], "rowLimit": 25000,
              "dimensionFilterGroups": [{"filters": [{"dimension": "page", "operator": "contains", "expression": HOST}]}]}
    req = urllib.request.Request(
        f"https://searchconsole.googleapis.com/webmasters/v3/sites/{urllib.parse.quote(PROP, safe='')}/searchAnalytics/query",
        data=json.dumps(cuerpo).encode(), headers={"Authorization": f"Bearer {token()}", "Content-Type": "application/json"})
    return json.load(urllib.request.urlopen(req, timeout=90)).get("rows", [])

def locale_de(url):
    m = re.match(rf"https://{re.escape(HOST)}/([a-zA-Z-]+)/", url)
    return m.group(1) if m else "(raíz)"

CASTELLANO = re.compile(r"(en euskera|traducci|significa|euskera|vasco|euskara)", re.I)

def resumen(r):
    imp = sum(x["impressions"] for x in r); cl = sum(x["clicks"] for x in r)
    print(f"  filas query×página: {len(r)} · impresiones {imp} · clics {cl}")
    por = collections.Counter(); porc = collections.Counter()
    for x in r:
        l = locale_de(x["keys"][1]); por[l] += x["impressions"]; porc[l] += x["clicks"]
    print("  impresiones por locale servido:", dict(por.most_common(8)))
    print("  clics por locale:", dict(porc.most_common(6)))
    cast = [x for x in r if CASTELLANO.search(x["keys"][0])]
    tot = sum(x["impressions"] for x in cast)
    mal = sum(x["impressions"] for x in cast if locale_de(x["keys"][1]) != "es")
    print(f"  consultas en castellano: {tot} impresiones · {mal} ({100*mal/max(1,tot):.0f} %) servidas con página NO /es/   ← MÉTRICA A")
    franja = collections.Counter(); clics_medio = 0
    for x in r:
        p = x["position"]; f = "top3" if p <= 3 else "4-10" if p <= 10 else "11-20" if p <= 20 else ">20"
        franja[f] += x["impressions"]
        if 3 < p <= 20: clics_medio += x["clicks"]
    print(f"  impresiones por posición: {dict(franja)} · clics en posiciones 4-20: {clics_medio}   ← MÉTRICA B")
    peor = sorted([x for x in cast if locale_de(x["keys"][1]) != "es"], key=lambda x: -x["impressions"])[:8]
    print("  peores casos (castellano → otra lengua):")
    for x in peor:
        print(f"    {x['keys'][0]!r:28} → {x['keys'][1].replace('https://'+HOST,'')[:46]:48} imp {x['impressions']:3} pos {x['position']:.1f}")

# ── Modo --palabras: que busca la gente y que cubrimos ya ────────────────────
PATRONES = [
    re.compile(r"^(?:como se dice |cómo se dice )?(.+?) en (?:euskera|euskara|vasco)$", re.I),
    re.compile(r"^(.+?) (?:traducci[oó]n|significado|en euskera|euskera)$", re.I),
    re.compile(r"^(?:que significa |qué significa )(.+?)$", re.I),
]

def palabra_de(consulta):
    """La palabra suelta que hay detras de una consulta de diccionario."""
    q = consulta.strip().lower()
    for p in PATRONES:
        m = p.match(q)
        if m and 1 <= len(m.group(1).split()) <= 3:
            return m.group(1).strip()
    if 1 <= len(q.split()) <= 2 and not any(x in q for x in ("kaixo", "curso", "app", "aprender")):
        return q
    return None

def cobertura(filas):
    """Cruza lo que se busca con lo que el hiztegia ya cubre. Es la cola de
    contenido, ordenada por demanda real."""
    ruta = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "src", "data", "hiztegia", "es.json")
    if not os.path.exists(ruta):
        print("  (no hay hiztegia generado todavia)"); return
    datos = json.load(open(ruta, encoding="utf-8"))
    vascas = {e["hitza"].lower(): e for e in datos["entradas"]}
    # Sin artículo: quien busca "pelo" no encuentra "el pelo" si se compara tal cual.
    def claves(texto):
        t = texto.lower().strip()
        yield t
        sin = re.sub(r"^(el|la|los|las|un|una|unos|unas)\s+", "", t)
        if sin != t:
            yield sin
    traducciones = {}
    for e in datos["entradas"]:
        for t in e["traducciones"]:
            for k in claves(t["texto"]):
                traducciones.setdefault(k, e)
    cubiertas, sin_ejemplo, huecos = collections.Counter(), collections.Counter(), collections.Counter()
    for f in filas:
        p = palabra_de(f["keys"][0])
        if not p:
            continue
        e = vascas.get(p) or traducciones.get(p)
        if not e:
            huecos[p] += f["impressions"]
        elif e["ejemplos"]:
            cubiertas[p] += f["impressions"]
        else:
            sin_ejemplo[p] += f["impressions"]
    print(f"\n  === COBERTURA DEL HIZTEGIA ===")
    print(f"  cubiertas con ejemplo: {len(cubiertas)} palabras, {sum(cubiertas.values())} impresiones")
    print(f"  cubiertas SIN ejemplo: {len(sin_ejemplo)} palabras, {sum(sin_ejemplo.values())} impresiones")
    print(f"  SIN cubrir:            {len(huecos)} palabras, {sum(huecos.values())} impresiones")
    print("\n  cola de contenido (lo que se busca y no tenemos, por demanda):")
    for p, n in huecos.most_common(25):
        print(f"    {n:4}  {p}")
    print("\n  cubiertas pero sin ejemplo de uso (candidatas a que se les escriba uno):")
    for p, n in sin_ejemplo.most_common(15):
        print(f"    {n:4}  {p}")


if __name__ == "__main__":
    hoy = dt.date.today()
    hasta = sys.argv[2] if len(sys.argv) > 2 else (hoy - dt.timedelta(days=2)).isoformat()
    desde = sys.argv[1] if len(sys.argv) > 1 else (dt.date.fromisoformat(hasta) - dt.timedelta(days=27)).isoformat()
    print(f"  {PROP} · {HOST} · {desde} → {hasta}")
    r = filas(desde, hasta)
    json.dump({"desde": desde, "hasta": hasta, "filas": r}, open(SALIDA, "w"), ensure_ascii=False, indent=1)
    resumen(r)
    if "--palabras" in sys.argv:
        cobertura(r)
    print(f"  filas crudas → {SALIDA}")
