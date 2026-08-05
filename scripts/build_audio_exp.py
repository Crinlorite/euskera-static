#!/usr/bin/env python3
"""Voz del modo Expedición (Aitonaren Hitzak) vía BATCH API de Gemini.

Genera los clips de los beats `speak` y de las gain-words que no están en el
banco de lecciones. Receta = la ganadora del banco (R2 + modelo PRO): portadora
que ancla el euskera + una voz POR PERSONAJE en cada request del batch.

Entrada:  scratchpad/exp-voice-missing.json  (lo escribe exp_voice_inventory.mjs)
Salida:   public/audio/exp/<sha1[:12]>.mp3  +  src/data/audio-exp.json

Uso:  python3 scripts/build_audio_exp.py            # submit + poll + harvest
Resumible: las claves ya presentes en el manifest con mp3 en disco se saltan.
"""
from __future__ import annotations

import base64
import hashlib
import json
import re
import struct
import subprocess
import time
import urllib.request
import pathlib

ROOT = pathlib.Path(__file__).parent.parent
KEY = json.load(open("/root/.claude/gemini.local.json"))["GEMINI_API_KEY"]
MODEL = "gemini-2.5-pro-preview-tts"
CARRIER = "Read in Basque (euskara) with native Basque pronunciation — the h is silent: {t}"
WORD_CARRIER = "Read this single Basque word clearly: {t}"
OUT_DIR = ROOT / "public/audio/exp"
MANIFEST = ROOT / "src/data/audio-exp.json"
MISSING = pathlib.Path("/tmp/claude-0/-root/0bf7e9ac-af85-4d9e-b4c4-54e6b458abe5/scratchpad/exp-voice-missing.json")
POLL_S = 45

# Reparto: dos voces validadas en euskera (Kore/Puck) + Charon a prueba para
# los tres "oscuros" (QA con whisper decide; fallback = regenerar como Puck).
VOICE_BY_SPEAKER = {
    "Mirentxu": "Kore",
    "Mari": "Kore",
    "Tú": "Kore",
    "Basajaun": "Charon",
    "Sugaar": "Charon",
    "Hitz Beltza": "Charon",
}
DEFAULT_VOICE = "Puck"  # Aitonaren ahotsa (todas las variantes), carta, Patxi, Hodei


def tts_text(s: str) -> str:
    t = s.replace("/", ", ").replace("·", ", ").replace("…", "").replace("«", "").replace("»", "")
    return re.sub(r"\s+", " ", t).strip()


def voice_of(speaker: str | None) -> str:
    if not speaker:
        return DEFAULT_VOICE
    for name, v in VOICE_BY_SPEAKER.items():
        if speaker.startswith(name):
            return v
    return DEFAULT_VOICE


def api(path, payload=None, timeout=300):
    req = urllib.request.Request(
        f"https://generativelanguage.googleapis.com/v1beta/{path}?key={KEY}",
        data=json.dumps(payload).encode() if payload is not None else None,
        headers={"Content-Type": "application/json"})
    return json.load(urllib.request.urlopen(req, timeout=timeout))


def wav_from_part(part):
    pcm = base64.b64decode(part["inlineData"]["data"])
    m = re.search(r"rate=(\d+)", part["inlineData"]["mimeType"])
    rate = int(m.group(1)) if m else 24000
    return (b"RIFF" + struct.pack("<I", 36 + len(pcm)) + b"WAVEfmt " +
            struct.pack("<IHHIIHH", 16, 1, 1, rate, rate * 2, 2, 16) +
            b"data" + struct.pack("<I", len(pcm)) + pcm)


def main():
    src = json.load(open(MISSING))
    jobs_in = [(l["eu"], CARRIER, voice_of(l.get("speaker"))) for l in src["lines"]]
    jobs_in += [(w, WORD_CARRIER, "Kore") for w in src["words"]]

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    manifest = json.load(open(MANIFEST)) if MANIFEST.exists() else {}
    todo = [(k, carrier, voice) for k, carrier, voice in jobs_in
            if k not in manifest or not (OUT_DIR / manifest[k]).exists()]
    print(f"clips: {len(jobs_in)} · hechos: {len(jobs_in) - len(todo)} · pendientes: {len(todo)}", flush=True)
    if not todo:
        print("nada que hacer")
        return

    reqs = [{
        "request": {
            "contents": [{"parts": [{"text": carrier.format(t=tts_text(k))}]}],
            "generationConfig": {
                "responseModalities": ["AUDIO"],
                "speechConfig": {"voiceConfig": {"prebuiltVoiceConfig": {"voiceName": voice}}},
            },
        },
        "metadata": {"key": k},
    } for k, carrier, voice in todo]
    r = api(f"models/{MODEL}:batchGenerateContent", {
        "batch": {"displayName": f"audio-exp-{len(reqs)}",
                  "inputConfig": {"requests": {"requests": reqs}}}})
    job = r["name"]
    print(f"→ job {job} ({len(reqs)} clips)", flush=True)

    t0 = time.time()
    while True:
        time.sleep(POLL_S)
        d = api(job)
        st = d.get("metadata", {}).get("state", d.get("state", "?"))
        print(f"  [{int(time.time() - t0)}s] {st}", flush=True)
        if str(st).endswith("SUCCEEDED"):
            break
        if str(st).endswith(("FAILED", "CANCELLED", "EXPIRED")):
            print(json.dumps(d)[:400])
            raise SystemExit(f"batch {st}")

    inl = d.get("response", {}).get("inlinedResponses", {}).get("inlinedResponses", [])
    ok = err = 0
    wav_tmp = OUT_DIR / "_batchapi.wav"
    for item in inl:
        k = item.get("metadata", {}).get("key")
        if not k:
            err += 1
            continue
        try:
            parts = item["response"]["candidates"][0]["content"]["parts"]
            wav_tmp.write_bytes(wav_from_part(parts[0]))
            mp3 = OUT_DIR / (hashlib.sha1(k.encode()).hexdigest()[:12] + ".mp3")
            subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-i", str(wav_tmp),
                            "-ac", "1", "-b:a", "64k", str(mp3)], check=True)
            manifest[k] = mp3.name
            ok += 1
        except (KeyError, IndexError):
            err += 1
            e = str(item.get("response", {}).get("error", ""))[:80]
            print(f"  ✗ sin audio: «{k}»{' · ' + e if e else ''}", flush=True)
    wav_tmp.unlink(missing_ok=True)
    MANIFEST.write_text(json.dumps(manifest, ensure_ascii=False, indent=0, sort_keys=True) + "\n")
    print(f"harvest: {ok} ok · {err} err · manifest {len(manifest)} entradas", flush=True)


if __name__ == "__main__":
    main()
