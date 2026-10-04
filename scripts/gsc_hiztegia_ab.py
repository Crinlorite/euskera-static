#!/usr/bin/env python3
"""Prueba A/B del Hiztegia (4-oct-2026): CTR de cada brazo en Search Console.

  tratada  descripcion que abre con una frase real + titulo "con frases de ejemplo"
  control  igual de elegible, pero con el texto del 29-sep
  fuera    entradas sin frase traducida que quepa: no entran en la prueba

Uso: gsc_hiztegia_ab.py [desde] [hasta]   (por defecto, los ultimos 14 dias)
Los brazos salen de scripts/hiztegia_ab_grupos.mjs. Comparar SOLO fechas
posteriores al despliegue, y dejar unos dias para que Google relea las paginas.
"""
import collections, datetime as dt, json, subprocess, sys, urllib.parse, urllib.request
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
import gsc_linea_base as g

RAIZ = Path(__file__).parent.parent


def paginas(desde, hasta):
    cuerpo = {"startDate": desde, "endDate": hasta, "dimensions": ["page"], "rowLimit": 25000,
              "dataState": "all",
              "dimensionFilterGroups": [{"filters": [
                  {"dimension": "page", "operator": "contains", "expression": g.HOST + "/es/hiztegia/"}]}]}
    req = urllib.request.Request(
        f"https://searchconsole.googleapis.com/webmasters/v3/sites/{urllib.parse.quote(g.PROP, safe='')}/searchAnalytics/query",
        data=json.dumps(cuerpo).encode(),
        headers={"Authorization": f"Bearer {g.token()}", "Content-Type": "application/json"})
    return json.load(urllib.request.urlopen(req, timeout=90)).get("rows", [])


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    hasta = args[1] if len(args) > 1 else (dt.date.today() - dt.timedelta(days=1)).isoformat()
    desde = args[0] if args else (dt.date.fromisoformat(hasta) - dt.timedelta(days=13)).isoformat()
    brazos = json.loads(subprocess.check_output(["node", "scripts/hiztegia_ab_grupos.mjs"], cwd=RAIZ))
    suma = collections.defaultdict(lambda: [0, 0, 0.0, 0])
    for r in paginas(desde, hasta):
        ruta = r["keys"][0].rstrip("/").split("/")
        if "gaiak" in ruta:
            continue
        b = brazos.get(ruta[-1], "desconocida")
        s = suma[b]
        s[0] += r["clicks"]; s[1] += r["impressions"]; s[2] += r["position"] * r["impressions"]; s[3] += 1
    print(f"  Hiztegia A/B · {desde} → {hasta}")
    for b in ("tratada", "control", "fuera", "desconocida"):
        if b not in suma:
            continue
        c, i, p, n = suma[b]
        print(f"  {b:11} {n:4} páginas · {c:4} clics / {i:6} imp · CTR {100 * c / i:5.2f} % · posición {p / i:4.1f}")
    t, k = suma.get("tratada"), suma.get("control")
    if t and k and t[1] and k[1]:
        print(f"  diferencia de CTR (tratada − control): {100 * (t[0] / t[1] - k[0] / k[1]):+.2f} puntos")
        if t[0] + k[0] < 20:
            print("  ⚠ menos de 20 clics entre los dos brazos: aún no hay veredicto")


if __name__ == "__main__":
    main()
