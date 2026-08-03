#!/usr/bin/env python3
"""Cinturón de los overlays seed_i18n/<loc>.json:
1) mismo juego de claves que la plantilla es.json (ni de más ni de menos);
2) las claves cuyo valor es es euskera puro / horas (sin marcadores de
   castellano) deben quedar IDÉNTICAS — nadie "traduce" euskera por error;
3) el HTML de las tareas conserva las mismas etiquetas.
Uso: check_seed_overlays.py [loc...] (sin args: todos los que existan)."""
import json
import re
import sys
from pathlib import Path

D = Path(__file__).parent / "seed_i18n"
tpl = json.loads((D / "es.json").read_text(encoding="utf-8"))

# Claves cuyo valor es euskera puro / cifras: DEBEN quedar idénticas en todo
# overlay (lista explícita — nada de heurísticas con falsos positivos).
VERBATIM = (
    {f"rq:rd-jai-4.opt{i}" for i in range(4)}          # Su artifizialak, Pilota-partida…
    | {f"rq:rd-ane-4.opt{i}" for i in range(3)}         # 31 / 25 / 28
    | {f"lq:ls-kaf-3.opt{i}" for i in range(4)}         # 3,50 € …
    | {f"sp:ex-a1p1-mp1.{i}" for i in range(7)}         # respuestas eu del set 1
    | {f"sp:ex-a1p1-mp2.{i}" for i in range(4)}         # horas 13:00-19:50 (mp2.4/5 llevan texto)
    | {f"sp:ex-a1p2-mp1.{i}" for i in range(6)}
    | {f"sp:ex-a1p2-mp2.{i}" for i in range(6)}
)
EU_QUOTE = re.compile(r"«([^»]+)»")  # citas eu en explicaciones: deben sobrevivir tal cual
TAGS = re.compile(r"</?[a-z]+>|<br>")

locs = sys.argv[1:] or sorted(p.stem for p in D.glob("*.json") if p.stem != "es")
bad = 0
for loc in locs:
    ov = json.loads((D / f"{loc}.json").read_text(encoding="utf-8"))
    extra = set(ov) - set(tpl)
    missing = set(tpl) - set(ov)
    for k in sorted(extra): print(f"✗ {loc}: clave sobrante {k}"); bad += 1
    for k in sorted(missing): print(f"✗ {loc}: FALTA {k}"); bad += 1
    for k in sorted(VERBATIM & set(ov)):
        if ov[k] != tpl[k]:
            print(f"✗ {loc}: verbatim alterado {k}: {tpl[k]!r} → {ov[k]!r}"); bad += 1
    for k in ov:
        if k not in tpl: continue
        if sorted(TAGS.findall(tpl[k])) != sorted(TAGS.findall(ov[k])):
            print(f"✗ {loc}: etiquetas HTML distintas en {k}"); bad += 1
        for q in EU_QUOTE.findall(tpl[k]):
            if q not in ov[k]:
                print(f"✗ {loc}: cita eu perdida en {k}: «{q}»"); bad += 1
    if not bad:
        print(f"✓ {loc}: {len(ov)} claves · {len(VERBATIM)} verbatims intactos")
if bad:
    sys.exit(f"{bad} problemas")
