#!/usr/bin/env python3
"""Extrae a scripts/seed_i18n/es.json la PLANTILLA de cadenas vehiculares de los
SEED_* de build_bank.py (lo único del banco que no sale del content traducido).
Las claves son estables (id + campo); el euskera NO entra en la plantilla.
Los overlays <loc>.json de cada idioma usan exactamente estas claves."""
import json
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
import build_bank as bb

# señal de castellano para filtrar opciones eu de los items de gramática
ES_MARK = re.compile(r"[áéíóúñ¿¡]|(?:^|\s)(?:el|la|los|las|un|una|de|del|en|que|y|es|no)\s", re.I)

tpl = {}

for it in bb.SEED_GR:
    tpl[f"it:{it['id']}.prompt"] = it["prompt"]
    if it.get("explanation"):
        tpl[f"it:{it['id']}.expl"] = it["explanation"]
    for i, op in enumerate(it.get("options") or []):
        if ES_MARK.search(op):
            tpl[f"it:{it['id']}.opt{i}"] = op

for r in bb.SEED_READINGS:
    for q in r["questions"]:
        tpl[f"rq:{q['id']}.prompt"] = q["prompt"]
        for i, op in enumerate(q.get("options") or []):
            tpl[f"rq:{q['id']}.opt{i}"] = op
        if q.get("explanation"):
            tpl[f"rq:{q['id']}.expl"] = q["explanation"]

for l in bb.SEED_LISTENINGS:
    for q in l["questions"]:
        tpl[f"lq:{q['id']}.prompt"] = q["prompt"]
        for i, op in enumerate(q.get("options") or []):
            tpl[f"lq:{q['id']}.opt{i}"] = op
        if q.get("explanation"):
            tpl[f"lq:{q['id']}.expl"] = q["explanation"]

for w in bb.SEED_WRITINGS:
    tpl[f"wr:{w['id']}.task"] = w["task"]
    for i, c in enumerate(w["checks"]):
        tpl[f"wr:{w['id']}.chk{i}"] = c["label"]

for c in bb.SEED_CARDS:
    tpl[f"sc:{bb.norm(c['eu'])}"] = c["es"]

for s in bb.SEED_PAIRSETS:
    for i, p in enumerate(s["pairs"]):
        tpl[f"sp:{s['id']}.{i}"] = p["es"]

out = Path(__file__).parent / "seed_i18n" / "es.json"
out.parent.mkdir(exist_ok=True)
out.write_text(json.dumps(tpl, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
print(f"✓ {out} — {len(tpl)} cadenas")
