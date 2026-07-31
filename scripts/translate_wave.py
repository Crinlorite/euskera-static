#!/usr/bin/env python3
"""Ola de traducción por Batch API — paridad A2 (y futuras olas) a los 17 idiomas.

Arquitectura de seguridad (la misma promesa que validate-parity.mjs exige):
- El EUSKERA jamás pasa por el modelo: answers, lado `eu`, ids, números,
  estructura… se COPIAN del original es. Paridad por construcción.
- Al modelo solo viajan los campos vehiculares (title, prompt, explanation,
  hint, lado `es`, description, body) como JSON plano clave→texto, y debe
  devolver el MISMO JSON traducido (se valida clave a clave).
- Opciones de multiple-choice: se clasifican — si son contenido euskera
  (sin marcadores castellanos) se copian; si son vehiculares se traducen.

Uso:
  python3 scripts/translate_wave.py plan            # inventario y coste aprox
  python3 scripts/translate_wave.py run [locales…]  # lanza batch + ensambla
"""
from __future__ import annotations

import json
import re
import sys
import time
import pathlib
import urllib.request
import urllib.error

sys.path.insert(0, str(pathlib.Path(__file__).parent))
from build_bank import lenient_yaml

import yaml

ROOT = pathlib.Path(__file__).resolve().parent.parent
LESSONS_ES = ROOT / "src/content/lessons/es/a2"
UNITS_ES = ROOT / "src/content/units/es/a2"
LEVEL_ES = ROOT / "src/content/levels/es/a2.yaml"

KEY = json.load(open("/root/.claude/gemini.local.json"))["GEMINI_API_KEY"]
MODEL = "gemini-3.1-pro-preview"
LEVEL_REVIEW = "a1"  # se itera a1+a2 en main

LANGS = {
    "ca": "Català", "gl": "Galego", "oc": "Occitan (aranés d'era Val d'Aran)",
    "ast": "Asturianu", "an": "Aragonés", "en": "English", "ar": "العربية (Arabic)",
    "fr": "Français", "ro": "Română", "pt-BR": "Português (Brasil)", "de": "Deutsch",
    "it": "Italiano", "ru": "Русский (Russian)", "pl": "Polski",
    "zh-Hans": "简体中文 (Simplified Chinese)", "ja": "日本語 (Japanese)", "ko": "한국어 (Korean)",
}

ES_MARKERS = re.compile(r"[áéíóúü¿¡]|(?:\b(?:el|la|los|las|un|una|de|del|que|y|es|no|sí|con|para|por|se|me|te|lo)\b)", re.I)


def is_vehicular(text: str) -> bool:
    """True si el texto parece castellano (vehicular) y debe traducirse."""
    return bool(ES_MARKERS.search(text))


def options_vehicular(opts: list[str]) -> bool:
    return any(is_vehicular(o) for o in opts)


# ── extracción de segmentos por tipo de fichero ──

def segments_lesson(fm: dict, body: str) -> dict:
    seg = {"title": fm["title"], "body": body}
    for i, ex in enumerate(fm.get("exercises") or []):
        if "prompt" in ex:
            seg[f"x{i}.prompt"] = ex["prompt"]
        if ex.get("explanation"):
            seg[f"x{i}.explanation"] = ex["explanation"]
        if ex.get("hint"):
            seg[f"x{i}.hint"] = ex["hint"]
        if ex.get("type") == "multiple-choice" and options_vehicular(ex["options"]):
            for j, o in enumerate(ex["options"]):
                seg[f"x{i}.opt{j}"] = o
        for j, c in enumerate(ex.get("cards") or []):
            if is_vehicular(c["es"]) or True:  # el lado es SIEMPRE es vehicular en A2
                seg[f"x{i}.card{j}"] = c["es"]
        for j, p in enumerate(ex.get("pairs") or []):
            if is_vehicular(p["es"]):
                seg[f"x{i}.pair{j}"] = p["es"]
    return seg


def apply_lesson(fm: dict, tr: dict) -> dict:
    out = json.loads(json.dumps(fm))  # copia profunda
    out["title"] = tr["title"]
    for i, ex in enumerate(out.get("exercises") or []):
        if f"x{i}.prompt" in tr:
            ex["prompt"] = tr[f"x{i}.prompt"]
        if f"x{i}.explanation" in tr:
            ex["explanation"] = tr[f"x{i}.explanation"]
        if f"x{i}.hint" in tr:
            ex["hint"] = tr[f"x{i}.hint"]
        if ex.get("type") == "multiple-choice":
            for j in range(len(ex["options"])):
                if f"x{i}.opt{j}" in tr:
                    ex["options"][j] = tr[f"x{i}.opt{j}"]
        for j, c in enumerate(ex.get("cards") or []):
            if f"x{i}.card{j}" in tr:
                c["es"] = tr[f"x{i}.card{j}"]
        for j, p in enumerate(ex.get("pairs") or []):
            if f"x{i}.pair{j}" in tr:
                p["es"] = tr[f"x{i}.pair{j}"]
    return out


def segments_unit(u: dict) -> dict:
    return {"title": u["title"], "description": u["description"]}


def apply_unit(u: dict, tr: dict) -> dict:
    out = dict(u)
    out["title"], out["description"] = tr["title"], tr["description"]
    return out


def segments_level(l: dict) -> dict:
    seg = {"name": l["name"], "description": l["description"]}
    for i, c in enumerate(l.get("curriculum") or []):
        seg[f"c{i}"] = c["title"]
    return seg


def apply_level(l: dict, tr: dict) -> dict:
    out = json.loads(json.dumps(l))
    out["name"], out["description"] = tr["name"], tr["description"]
    for i, c in enumerate(out.get("curriculum") or []):
        out["curriculum"][i]["title"] = tr[f"c{i}"]
    return out


REVIEW_PROMPT = """You are a professional reviewer of translations for a Basque-language course whose teaching language was Spanish, translated into {lang}.
Below is a JSON with two objects: "source" (original Spanish) and "current" (the existing {lang} translation, possibly flawed).
Produce the CORRECTED {lang} translation: fix mistranslations, unnatural phrasing, terminology drift and register, keeping what is already good.
Rules:
- Return ONLY a JSON object with EXACTLY the same keys as "source", values = corrected {lang} text.
- NEVER translate or alter Basque words/phrases (the taught language): quotes, *italics*, **bold** Basque terms, suffixes like "-rekin" stay EXACTLY as written.
- Keep Markdown/HTML structure, tables, ___ placeholders and → arrows intact.
- Didactic, natural tone for language learners.
- Table column headers that NAME the teaching language (e.g. "Castellano", "Español") must become the name of the TARGET language {lang} — the column now holds {lang} text, not Spanish.

{payload}"""

PROMPT = """You are translating a Basque-language course whose TEACHING language is Spanish into {lang}.
Translate ONLY the JSON values below from Spanish to {lang}. Rules:
- Return a JSON object with EXACTLY the same keys, values translated.
- NEVER translate Basque words or phrases (the language being taught): anything in Basque — inside quotes, in *italics*, in **bold**, terms like "kaixo", suffixes like "-rekin" — must be preserved EXACTLY as written.
- Keep all Markdown/HTML formatting, tables, emphasis, line breaks and punctuation structure intact.
- Keep placeholders like ___ and arrows → unchanged.
- Natural, didactic tone for language learners; concise like the original.
- Table column headers that NAME the teaching language (e.g. "Castellano", "Español") must become the name of the TARGET language {lang} — the column now holds {lang} text, not Spanish.
- The word «euskera»/«euskara» refers to the Basque language: use the natural name for it in {lang}.
Return ONLY the JSON object, no commentary.

{payload}"""


def parse_md(path: pathlib.Path):
    t = path.read_text(encoding="utf-8")
    m = re.match(r"^---\n(.*?)\n---\n(.*)$", t, re.S)
    return lenient_yaml(m.group(1)), m.group(2)


def collect_review_jobs(loc):
    """A1: (kind, rel, data_es, body_es, seg_es, seg_actual|None)."""
    out = []
    base_es = ROOT / "src/content/lessons/es" / LEVEL_REVIEW
    for f in sorted(base_es.rglob("*.md")):
        rel = f.relative_to(ROOT / "src/content/lessons/es")
        fm, body = parse_md(f)
        seg = segments_lesson(fm, body)
        cur_path = ROOT / "src/content/lessons" / loc / rel
        seg_cur = None
        if cur_path.exists():
            try:
                fmc, bodyc = parse_md(cur_path)
                seg_cur = segments_lesson(fmc, bodyc)
                if set(seg_cur.keys()) != set(seg.keys()):
                    seg_cur = None
            except Exception:
                seg_cur = None
        out.append(("lesson", rel, fm, body, seg, seg_cur))
    for f in sorted((ROOT / "src/content/units/es" / LEVEL_REVIEW).glob("*/index.yaml")):
        rel = f.relative_to(ROOT / "src/content/units/es")
        u = yaml.safe_load(f.read_text(encoding="utf-8"))
        seg = segments_unit(u)
        cur = ROOT / "src/content/units" / loc / rel
        seg_cur = None
        if cur.exists():
            try:
                uc = yaml.safe_load(cur.read_text(encoding="utf-8"))
                sc = segments_unit(uc)
                seg_cur = sc if set(sc) == set(seg) else None
            except Exception:
                pass
        out.append(("unit", rel, u, None, seg, seg_cur))
    l = yaml.safe_load(LEVEL_ES.parent.joinpath(f"{LEVEL_REVIEW}.yaml").read_text(encoding="utf-8"))
    seg = segments_level(l)
    cur = ROOT / "src/content/levels" / loc / f"{LEVEL_REVIEW}.yaml"
    seg_cur = None
    if cur.exists():
        try:
            lc = yaml.safe_load(cur.read_text(encoding="utf-8"))
            sc = segments_level(lc)
            seg_cur = sc if set(sc) == set(seg) else None
        except Exception:
            pass
    out.append(("level", pathlib.Path("a1.yaml"), l, None, seg, seg_cur))
    return out


def collect_jobs():
    jobs = []  # (kind, rel, data, body|None, segments)
    for f in sorted(LESSONS_ES.rglob("*.md")):
        fm, body = parse_md(f)
        jobs.append(("lesson", f.relative_to(ROOT / "src/content/lessons/es"), fm, body,
                     segments_lesson(fm, body)))
    for f in sorted(UNITS_ES.glob("*/index.yaml")):
        u = yaml.safe_load(f.read_text(encoding="utf-8"))
        jobs.append(("unit", f.relative_to(ROOT / "src/content/units/es"), u, None,
                     segments_unit(u)))
    l = yaml.safe_load(LEVEL_ES.read_text(encoding="utf-8"))
    jobs.append(("level", pathlib.Path("a2.yaml"), l, None, segments_level(l)))
    return jobs


def api(path, payload=None, timeout=180):
    req = urllib.request.Request(
        f"https://generativelanguage.googleapis.com/v1beta/{path}?key={KEY}",
        data=json.dumps(payload).encode() if payload is not None else None,
        headers={"Content-Type": "application/json"})
    return json.load(urllib.request.urlopen(req, timeout=timeout))


def submit_batch(requests_, name):
    return api(f"models/{MODEL}:batchGenerateContent", {
        "batch": {"displayName": name,
                  "inputConfig": {"requests": {"requests": requests_}}}})["name"]


def wait_job(job):
    while True:
        time.sleep(30)
        st = api(job).get("metadata", {}).get("state", "?")
        if st.endswith("SUCCEEDED") or st.endswith("FAILED") or st.endswith("CANCELLED"):
            return st


def dump_lesson(fm: dict, body: str) -> str:
    y = yaml.safe_dump(fm, allow_unicode=True, sort_keys=False, width=10000)
    return f"---\n{y}---\n{body}"


def main():
    mode = sys.argv[1] if len(sys.argv) > 1 else "plan"
    locales = [a for a in sys.argv[2:] if a in LANGS] or list(LANGS)
    jobs = []  # modo todo-revisión: sin traducciones desde cero
    n_seg = sum(len(j[4]) for j in jobs)
    n_char = sum(len(v) for j in jobs for v in j[4].values())
    print(f"ficheros es/a2: {len(jobs)} · segmentos: {n_seg} · chars: {n_char} · "
          f"locales: {len(locales)} → peticiones: {len(jobs)*len(locales)}")
    if mode == "plan":
        return

    # ── peticiones: T=traducir A2 · R=revisar A1 (o traducir si falta base) ──
    reqs = []
    global LEVEL_REVIEW
    review_jobs = {}
    for loc in locales:
        both = []
        for lvl in ("a1", "a2"):
            LEVEL_REVIEW = lvl
            both.extend(collect_review_jobs(loc))
        review_jobs[loc] = both
    for loc in locales:
        for k, (kind, rel, data, body, seg) in enumerate(jobs):
            payload = json.dumps(seg, ensure_ascii=False)
            reqs.append({
                "request": {
                    "contents": [{"parts": [{"text": PROMPT.format(lang=LANGS[loc], payload=payload)}]}],
                    "generationConfig": {"responseMimeType": "application/json",
                                          "temperature": 0.2,
                                          "thinkingConfig": {"thinkingBudget": 128}},
                },
                "metadata": {"key": f"T|{loc}|{k}"},
            })
        for k, (kind, rel, data, body, seg, seg_cur) in enumerate(review_jobs[loc]):
            if seg_cur is None:
                prompt = PROMPT.format(lang=LANGS[loc], payload=json.dumps(seg, ensure_ascii=False))
            else:
                prompt = REVIEW_PROMPT.format(lang=LANGS[loc], payload=json.dumps(
                    {"source": seg, "current": seg_cur}, ensure_ascii=False))
            reqs.append({
                "request": {
                    "contents": [{"parts": [{"text": prompt}]}],
                    "generationConfig": {"responseMimeType": "application/json",
                                          "temperature": 0.2,
                                          "thinkingConfig": {"thinkingBudget": 128}},
                },
                "metadata": {"key": f"R|{loc}|{k}"},
            })
    print(f"enviando {len(reqs)} peticiones en lotes de 400…", flush=True)
    jobs_ids = []
    for i in range(0, len(reqs), 400):
        jid = submit_batch(reqs[i:i+400], f"a2-{i//400}")
        jobs_ids.append(jid)
        print("→", jid, flush=True)
        time.sleep(2)

    results = {}
    for jid in jobs_ids:
        st = wait_job(jid)
        print(jid, st, flush=True)
        if not st.endswith("SUCCEEDED"):
            continue
        d = api(jid, timeout=600)
        for item in d["response"]["inlinedResponses"]["inlinedResponses"]:
            mkey = item.get("metadata", {}).get("key")
            try:
                txt = item["response"]["candidates"][0]["content"]["parts"][0]["text"]
                results[mkey] = json.loads(txt)
            except Exception as e:  # noqa: BLE001
                print(f"  ✗ {mkey}: {e}", flush=True)

    # ── ensamblar (T y R) + informe de cambios de la revisión ──
    ok = bad = 0
    cambios = {loc: [0, 0] for loc in locales}   # [segmentos cambiados, total]
    def write_out(kind, rel, data, tr, loc):
        if kind == "lesson":
            fm2 = apply_lesson(data, tr)
            out = ROOT / "src/content/lessons" / loc / rel
            out.parent.mkdir(parents=True, exist_ok=True)
            out.write_text(dump_lesson(fm2, tr["body"]), encoding="utf-8")
        elif kind == "unit":
            u2 = apply_unit(data, tr)
            out = ROOT / "src/content/units" / loc / rel
            out.parent.mkdir(parents=True, exist_ok=True)
            out.write_text(yaml.safe_dump(u2, allow_unicode=True, sort_keys=False, width=10000), encoding="utf-8")
        else:
            l2 = apply_level(data, tr)
            name = rel.name
            out = ROOT / "src/content/levels" / loc / name
            out.parent.mkdir(parents=True, exist_ok=True)
            out.write_text(yaml.safe_dump(l2, allow_unicode=True, sort_keys=False, width=10000), encoding="utf-8")

    for loc in locales:
        for k, (kind, rel, data, body, seg, seg_cur) in enumerate(review_jobs[loc]):
            tr = results.get(f"R|{loc}|{k}")
            if not tr or set(tr.keys()) != set(seg.keys()):
                print(f"  ✗ R {loc}/{rel}: incompleta", flush=True)
                bad += 1
                continue
            if seg_cur:
                changed = sum(1 for kk in seg if tr[kk].strip() != seg_cur[kk].strip())
                cambios[loc][0] += changed
                cambios[loc][1] += len(seg)
            write_out(kind, rel, data, tr, loc)
            ok += 1

    for loc in locales:
        for k, (kind, rel, data, body, seg) in enumerate(jobs):
            tr = results.get(f"T|{loc}|{k}")
            if not tr or set(tr.keys()) != set(seg.keys()):
                print(f"  ✗ T {loc}/{rel}: incompleta", flush=True)
                bad += 1
                continue
            write_out(kind, rel, data, tr, loc)
            ok += 1

    print(f"\nensamblados {ok} · fallidos {bad}")
    print("\nINFORME DE REVISIÓN A1 (segmentos corregidos por el Pro):")
    for loc in sorted(locales, key=lambda l: -cambios[l][0]):
        c, t = cambios[loc]
        if t:
            print(f"  {loc:8s} {c}/{t} ({c*100//t}%) segmentos retocados")


if __name__ == "__main__":
    main()
