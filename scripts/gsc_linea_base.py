#!/usr/bin/env python3
"""Línea base de Search Console para euskera.crintech.pro (query × página).

Para qué: medir el efecto del hreflang y las descripciones (plan
docs/superpowers/plans/2026-09-07-seo-hreflang-descripciones-android.md).
Métrica principal: % de impresiones de consultas en castellano que Google
sirve con una página que NO es /es/ (7-sep-2026: 59 %).

Uso:  GSC_SA_JSON=/ruta/clave-cuenta-servicio.json python3 scripts/gsc_linea_base.py [desde] [hasta]
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

if __name__ == "__main__":
    hoy = dt.date.today()
    hasta = sys.argv[2] if len(sys.argv) > 2 else (hoy - dt.timedelta(days=2)).isoformat()
    desde = sys.argv[1] if len(sys.argv) > 1 else (dt.date.fromisoformat(hasta) - dt.timedelta(days=27)).isoformat()
    print(f"  {PROP} · {HOST} · {desde} → {hasta}")
    r = filas(desde, hasta)
    json.dump({"desde": desde, "hasta": hasta, "filas": r}, open(SALIDA, "w"), ensure_ascii=False, indent=1)
    resumen(r)
    print(f"  filas crudas → {SALIDA}")
