#!/usr/bin/env python3
"""Genera los audios de entzumena del simulakro (SEED_LISTENINGS) y los
VERIFICA por transcripción antes de darlos por buenos.

- Diálogos: multiSpeakerVoiceConfig (Kore+Puck) en una sola petición; si el
  modelo no lo soporta, fallback: cada línea por separado + concat con ffmpeg.
- Megafonías/mensajes: una voz (Kore), texto largo → sin portadora (los
  párrafos anclan solos el idioma; lección del 30-jul).
- Verificación: whisper small vs transcriptEu (sin nombres de hablante);
  ratio < 0.6 → el audio NO se instala y se avisa.

Salida: public/audio/eu/<id>.mp3 · Uso: python3 scripts/gen_listenings.py
"""
from __future__ import annotations

import re
import subprocess
import sys
import time
import unicodedata
import urllib.error
import pathlib
from difflib import SequenceMatcher

sys.path.insert(0, str(pathlib.Path(__file__).parent))
from build_bank import SEED_LISTENINGS
from build_audio_bank import OUT_DIR, dur_of
from build_audio_bank_batch import api, wav_from_part

MODEL = "gemini-2.5-pro-preview-tts"


def norm(s: str) -> str:
    s = unicodedata.normalize("NFD", s.lower())
    return "".join(c for c in s if c.isalnum())


def speech_config(speakers):
    if not speakers:
        return {"voiceConfig": {"prebuiltVoiceConfig": {"voiceName": "Kore"}}}
    return {"multiSpeakerVoiceConfig": {"speakerVoiceConfigs": [
        {"speaker": name, "voiceConfig": {"prebuiltVoiceConfig": {"voiceName": voice}}}
        for name, voice in speakers]}}


def gen_one(prompt: str, speakers) -> bytes:
    body = {"contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {"responseModalities": ["AUDIO"],
                                 "speechConfig": speech_config(speakers)}}
    r = api(f"models/{MODEL}:batchGenerateContent", {
        "batch": {"displayName": "listening", "inputConfig": {"requests": {"requests": [
            {"request": body, "metadata": {"key": "x"}}]}}}})
    job = r["name"]
    while True:
        time.sleep(20)
        st = api(job).get("metadata", {}).get("state", "?")
        if st.endswith("SUCCEEDED"):
            break
        if st.endswith("FAILED") or st.endswith("CANCELLED"):
            raise RuntimeError(st)
    d = api(job)
    item = d["response"]["inlinedResponses"]["inlinedResponses"][0]
    return wav_from_part(item["response"]["candidates"][0]["content"]["parts"][0])


def dialog_fallback_concat(l) -> bytes:
    """Cada línea con su voz por separado; ffmpeg concat con 0.5s de aire."""
    parts = []
    voice_of = dict(l["speakers"])
    for i, line in enumerate(l["transcriptEu"].split("\n")):
        name, text = line.split(":", 1)
        wav = gen_one(text.strip(), None) if voice_of[name.strip()] == "Kore" else None
        if wav is None:
            body_speakers = None
            # una voz concreta: petición single con esa voz
            wav = gen_single_voice(text.strip(), voice_of[name.strip()])
        p = OUT_DIR / f"_dlg{i}.wav"
        p.write_bytes(wav)
        parts.append(p)
    lst = OUT_DIR / "_dlg.txt"
    lst.write_text("".join(f"file '{p}'\n" for p in parts))
    out = OUT_DIR / "_dlg_all.wav"
    subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-f", "concat", "-safe", "0",
                    "-i", str(lst), "-c", "copy", str(out)], check=True)
    data = out.read_bytes()
    for p in parts:
        p.unlink(missing_ok=True)
    lst.unlink(missing_ok=True)
    out.unlink(missing_ok=True)
    return data


def gen_single_voice(text: str, voice: str) -> bytes:
    body = {"contents": [{"parts": [{"text": text}]}],
            "generationConfig": {"responseModalities": ["AUDIO"],
                                 "speechConfig": {"voiceConfig": {"prebuiltVoiceConfig": {"voiceName": voice}}}}}
    r = api(f"models/{MODEL}:batchGenerateContent", {
        "batch": {"displayName": "ls-line", "inputConfig": {"requests": {"requests": [
            {"request": body, "metadata": {"key": "x"}}]}}}})
    job = r["name"]
    while True:
        time.sleep(15)
        st = api(job).get("metadata", {}).get("state", "?")
        if st.endswith("SUCCEEDED"):
            break
        if st.endswith("FAILED"):
            raise RuntimeError(st)
    d = api(job)
    return wav_from_part(d["response"]["inlinedResponses"]["inlinedResponses"][0]
                         ["response"]["candidates"][0]["content"]["parts"][0])


def main():
    from faster_whisper import WhisperModel
    whisper = WhisperModel("small", device="cpu", compute_type="int8")
    ok = 0
    for l in SEED_LISTENINGS:
        dst = OUT_DIR / f"{l['id']}.mp3"
        if dst.exists() and "--force" not in sys.argv:
            print(f"= {l['id']} ya existe"); ok += 1; continue
        try:
            if l["speakers"]:
                prompt = ("TTS the following conversation in Basque (euskara) between "
                          + " and ".join(n for n, _ in l["speakers"])
                          + ", with natural native Basque pronunciation:\n\n" + l["transcriptEu"])
                try:
                    wav_bytes = gen_one(prompt, l["speakers"])
                except (RuntimeError, urllib.error.HTTPError, KeyError) as e:
                    print(f"  multivoz falló ({e}) → concat por líneas", flush=True)
                    wav_bytes = dialog_fallback_concat(l)
            else:
                wav_bytes = gen_one(l["transcriptEu"], None)
            wav = OUT_DIR / "_ls.wav"
            wav.write_bytes(wav_bytes)
            subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-i", str(wav),
                            "-ac", "1", "-b:a", "64k", str(dst)], check=True)
            wav.unlink()
            segs, _ = whisper.transcribe(str(dst), language="eu", beam_size=5)
            heard = " ".join(s.text.strip() for s in segs)
            expected = re.sub(r"^[A-Za-zÁ-ú]+:", "", l["transcriptEu"], flags=re.M)
            ratio = SequenceMatcher(None, norm(expected), norm(heard)).ratio()
            print(f"{'✓' if ratio >= 0.6 else '⚠'} {l['id']}: {dur_of(dst):.1f}s · "
                  f"ratio {ratio:.2f} · «{heard[:90]}…»", flush=True)
            if ratio < 0.6:
                dst.rename(dst.with_suffix(".mp3.rechazado"))
                print(f"  RECHAZADO (no se instala)", flush=True)
            else:
                ok += 1
        except Exception as e:  # noqa: BLE001
            print(f"✗ {l['id']}: {e}", flush=True)
    print(f"\n{ok}/{len(SEED_LISTENINGS)} audios de entzumena verificados e instalados")
    if ok < len(SEED_LISTENINGS):
        sys.exit(1)


if __name__ == "__main__":
    main()
