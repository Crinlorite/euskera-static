#!/usr/bin/env python3
"""Regeneración TOTAL del banco de audio con la receta ganadora del A/B (31-jul):

    R2 (single con instrucción de euskera reforzada) + modelo PRO.

La 1ª pasada (frases a pelo) salía con fonética adivinada («bihar» con h
española): las frases cortas sueltas no anclan el idioma. La instrucción
portadora — que NO se vocaliza — lo fija.

Sobrescribe los MISMOS ficheros (nombre = sha1 de la frase): la web no cambia.
Si una frase se niega (sin audio), se CONSERVA el mp3 anterior y se reintenta
en una 2ª pasada con variante de portadora; lo irreductible queda listado.
"""
from __future__ import annotations

import json
import hashlib
import pathlib
import subprocess
import sys
import time

sys.path.insert(0, str(pathlib.Path(__file__).parent))
from build_audio_bank import MANIFEST, OUT_DIR, FLAGGED, collect, tts_text, dur_of
from build_audio_bank_batch import api, wav_from_part, VOICE

MODEL = "gemini-2.5-pro-preview-tts"
CARRIER = "Read in Basque (euskara) with native Basque pronunciation — the h is silent: {t}"
CARRIER2 = "Read clearly in Basque (euskara batua), the letter h is silent: {t}"
CHUNK = 400


def submit(chunk, carrier):
    reqs = [{
        "request": {
            "contents": [{"parts": [{"text": carrier.format(t=tts_text(texto))}]}],
            "generationConfig": {
                "responseModalities": ["AUDIO"],
                "speechConfig": {"voiceConfig": {"prebuiltVoiceConfig": {"voiceName": VOICE}}},
            },
        },
        "metadata": {"key": k},
    } for k, texto in chunk]
    return api(f"models/{MODEL}:batchGenerateContent", {
        "batch": {"displayName": f"regen-r2pro-{len(chunk)}",
                  "inputConfig": {"requests": {"requests": reqs}}}})["name"]


def wait(job):
    while True:
        time.sleep(30)
        st = api(job).get("metadata", {}).get("state", "?")
        if st.endswith("SUCCEEDED") or st.endswith("FAILED") or st.endswith("CANCELLED"):
            return st


def harvest(job, manifest):
    d = api(job, timeout=300)
    inl = d.get("response", {}).get("inlinedResponses", {}).get("inlinedResponses", [])
    ok, refused = 0, []
    wav = OUT_DIR / "_regen.wav"
    tmp = OUT_DIR / "_regen_tmp.mp3"
    for item in inl:
        k = item.get("metadata", {}).get("key")
        try:
            wav.write_bytes(wav_from_part(item["response"]["candidates"][0]["content"]["parts"][0]))
            subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-i", str(wav),
                            "-ac", "1", "-b:a", "64k", str(tmp)], check=True)
            dst = OUT_DIR / manifest[k]
            tmp.replace(dst)  # atómico: el viejo vive hasta tener el nuevo
            ok += 1
        except (KeyError, IndexError):
            refused.append(k)
    wav.unlink(missing_ok=True)
    tmp.unlink(missing_ok=True)
    return ok, refused


def run_pass(items, manifest, carrier, tag):
    jobs = []
    for i in range(0, len(items), CHUNK):
        jobs.append(submit(items[i:i + CHUNK], carrier))
        print(f"→ [{tag}] job {jobs[-1]} ({min(CHUNK, len(items)-i)} frases)", flush=True)
        time.sleep(2)
    total_ok, refused_all = 0, []
    for job in jobs:
        st = wait(job)
        if not st.endswith("SUCCEEDED"):
            print(f"✗ [{tag}] {job}: {st}", flush=True)
            continue
        ok, refused = harvest(job, manifest)
        total_ok += ok
        refused_all += refused
        print(f"✓ [{tag}] {job}: {ok} regenerados · {len(refused)} negados", flush=True)
    return total_ok, refused_all


def main():
    frases = collect(["a1", "a2"])
    manifest = json.load(open(MANIFEST))
    items = sorted((k, v) for k, v in frases.items() if k in manifest)
    print(f"a regenerar: {len(items)} · modelo {MODEL}", flush=True)

    t0 = time.time()
    ok1, refused = run_pass(items, manifest, CARRIER, "p1")
    ok2 = 0
    if refused:
        retry = [(k, frases[k]) for k in refused if k in frases]
        print(f"\n2ª pasada para {len(retry)} negadas…", flush=True)
        ok2, refused = run_pass(retry, manifest, CARRIER2, "p2")

    # cordura de duraciones sobre TODO el banco nuevo
    flagged, durs = [], []
    for k, fname in manifest.items():
        p = OUT_DIR / fname
        if not p.exists():
            continue
        dur = dur_of(p)
        durs.append(dur)
        if dur < 0.3 or dur > (0.5 + len(k) * 0.07) * 3 + 2.5:
            flagged.append({"texto": frases.get(k, k), "fichero": fname, "seg": round(dur, 2)})
    FLAGGED.write_text(json.dumps(flagged, ensure_ascii=False, indent=1), encoding="utf-8")
    mb = sum((OUT_DIR / f).stat().st_size for f in manifest.values() if (OUT_DIR / f).exists()) / 1e6

    print(f"\n{'✓' if not refused else '⚠'} regenerados {ok1 + ok2}/{len(items)} · "
          f"irreductibles (conservan voz vieja): {len(refused)} {refused[:8]}")
    print(f"  {mb:.1f} MB · media {sum(durs)/max(len(durs),1):.2f}s · "
          f"sospechosos {len(flagged)} · {(time.time()-t0)/60:.0f} min")
    if refused or flagged:
        sys.exit(1)


if __name__ == "__main__":
    main()
