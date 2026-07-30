#!/usr/bin/env python3
"""Banco de audio euskera vía BATCH API de Gemini.

Descubrimiento 30-jul: el modo interactivo del TTS 3.1 capa a 100 req/día,
pero `batchGenerateContent` tiene cola propia (y sale a mitad de precio).
Una petición POR FRASE con `metadata.key` = clave del manifest → la respuesta
se mapea por clave, sin depender del orden ni de cortes por silencio.

Uso:  python3 scripts/build_audio_bank_batch.py [a1 a2 ...]
Resumible igual que el interactivo (manifest compartido).
"""
from __future__ import annotations

import base64
import hashlib
import json
import re
import struct
import subprocess
import sys
import time
import urllib.error
import urllib.request
import pathlib

sys.path.insert(0, str(pathlib.Path(__file__).parent))
from build_audio_bank import (KEY, MODEL, VOICE, MANIFEST, OUT_DIR, FLAGGED,
                              collect, tts_text, dur_of, save_manifest)

CHUNK = 400          # frases por job (conservador frente a límites inline)
POLL_S = 45


def api(path, payload=None, timeout=120):
    req = urllib.request.Request(
        f"https://generativelanguage.googleapis.com/v1beta/{path}?key={KEY}",
        data=json.dumps(payload).encode() if payload is not None else None,
        headers={"Content-Type": "application/json"})
    return json.load(urllib.request.urlopen(req, timeout=timeout))


def submit(chunk):
    reqs = [{
        "request": {
            "contents": [{"parts": [{"text": tts_text(texto)}]}],
            "generationConfig": {
                "responseModalities": ["AUDIO"],
                "speechConfig": {"voiceConfig": {"prebuiltVoiceConfig": {"voiceName": VOICE}}},
            },
        },
        "metadata": {"key": k},
    } for k, texto in chunk]
    r = api(f"models/{MODEL}:batchGenerateContent", {
        "batch": {"displayName": f"audio-eu-{len(chunk)}",
                  "inputConfig": {"requests": {"requests": reqs}}}})
    return r["name"]


def wav_from_part(part):
    pcm = base64.b64decode(part["inlineData"]["data"])
    m = re.search(r"rate=(\d+)", part["inlineData"]["mimeType"])
    rate = int(m.group(1)) if m else 24000
    return (b"RIFF" + struct.pack("<I", 36 + len(pcm)) + b"WAVEfmt " +
            struct.pack("<IHHIIHH", 16, 1, 1, rate, rate * 2, 2, 16) +
            b"data" + struct.pack("<I", len(pcm)) + pcm)


def harvest(job, manifest):
    """Vuelca las respuestas del job al banco. Devuelve (ok, errores)."""
    d = api(f"{job}", timeout=300)
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
            print(f"  ✗ sin audio: «{k}»"
                  f"{' · ' + str(item.get('response', {}).get('error', ''))[:80] if item.get('response', {}).get('error') else ''}",
                  flush=True)
    wav_tmp.unlink(missing_ok=True)
    return ok, err


def main():
    levels = sys.argv[1:] or ["a1", "a2"]
    frases = collect(levels)
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    manifest = json.load(open(MANIFEST)) if MANIFEST.exists() else {}
    todo = sorted((k, v) for k, v in frases.items()
                  if k not in manifest or not (OUT_DIR / manifest[k]).exists())
    print(f"frases: {len(frases)} · hechas: {len(frases) - len(todo)} · "
          f"pendientes: {len(todo)}", flush=True)
    if not todo:
        print("nada que hacer")
        return

    chunks = [todo[i:i + CHUNK] for i in range(0, len(todo), CHUNK)]
    jobs = []
    for c in chunks:
        name = submit(c)
        jobs.append(name)
        print(f"→ job {name} ({len(c)} frases)", flush=True)
        time.sleep(2)

    pend = set(jobs)
    t0 = time.time()
    total_ok = total_err = 0
    while pend:
        time.sleep(POLL_S)
        for job in sorted(pend):
            st = api(job).get("metadata", {}).get("state", "?")
            if st in ("BATCH_STATE_SUCCEEDED", "SUCCEEDED"):
                ok, err = harvest(job, manifest)
                total_ok += ok
                total_err += err
                save_manifest(manifest)
                pend.discard(job)
                print(f"✓ {job}: {ok} audios · {err} errores "
                      f"({(time.time()-t0)/60:.0f} min)", flush=True)
            elif st in ("BATCH_STATE_FAILED", "BATCH_STATE_CANCELLED",
                        "BATCH_STATE_EXPIRED", "FAILED"):
                pend.discard(job)
                total_err += 1
                print(f"✗ {job}: {st}", flush=True)
        if time.time() - t0 > 6 * 3600:
            print("⏸ 6h esperando jobs — salir y resumir luego", flush=True)
            break

    save_manifest(manifest)
    # cordura de duraciones (mismo criterio que el interactivo)
    flagged, durs = [], []
    for k, fname in manifest.items():
        p = OUT_DIR / fname
        if not p.exists():
            continue
        d = dur_of(p)
        durs.append(d)
        if d < 0.35 or d > (0.5 + len(k) * 0.07) * 3 + 2:
            flagged.append({"texto": frases.get(k, k), "fichero": fname, "seg": round(d, 2)})
    FLAGGED.write_text(json.dumps(flagged, ensure_ascii=False, indent=1), encoding="utf-8")
    mb = sum((OUT_DIR / f).stat().st_size for f in manifest.values()
             if (OUT_DIR / f).exists()) / 1e6
    print(f"\n{'✓' if not pend and not total_err else '⚠'} manifest {len(manifest)} audios · "
          f"{mb:.1f} MB · +{total_ok} ahora · errores {total_err} · sospechosos {len(flagged)}")
    if pend or total_err:
        sys.exit(1)


if __name__ == "__main__":
    main()
