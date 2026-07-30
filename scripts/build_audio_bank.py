#!/usr/bin/env python3
"""Banco de audio euskera: una frase → un MP3 estático, generado UNA vez.

Fuente: lados eu de flashcards y match-pairs de las lecciones es (A1+A2).
TTS: Gemini `gemini-3.1-flash-tts-preview`, voz Kore (aprobada a oído el
30-jul-2026: «totalmente euskera»). La key vive en /root/.claude/gemini.local.json
y este script SOLO corre en local — a CF Pages llegan los MP3 committeados.

Salidas:
  public/audio/eu/<sha1-12>.mp3   (mono 64k)
  src/data/audio-eu.json          (clave normalizada → fichero; lo importan las islas)
  public/audio/eu/_flagged.json   (sospechosos para escucha humana: muy cortos
                                   o duración rara para sus caracteres)

Resumible: lo ya presente en el manifest con MP3 en disco se salta.
Uso:  python3 scripts/build_audio_bank.py [a1 a2 ...]
"""
from __future__ import annotations

import base64
import hashlib
import json
import pathlib
import re
import struct
import subprocess
import sys
import time
import unicodedata
import urllib.error
import urllib.request

sys.path.insert(0, str(pathlib.Path(__file__).parent))
from build_bank import lenient_yaml  # mismo YAML laxo que el resto de la casa

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT_DIR = ROOT / "public/audio/eu"
MANIFEST = ROOT / "src/data/audio-eu.json"
FLAGGED = OUT_DIR / "_flagged.json"
KEY = json.load(open("/root/.claude/gemini.local.json"))["GEMINI_API_KEY"]
MODEL = "gemini-3.1-flash-tts-preview"
VOICE = "Kore"


def norm_key(s: str) -> str:
    return unicodedata.normalize("NFC", s.strip().lower())


def tts_text(s: str) -> str:
    """Lo que se le lee al TTS: alternativas con pausa, sin ruido tipográfico."""
    t = s.replace("/", ", ").replace("·", ", ").replace("…", "").replace("«", "").replace("»", "")
    return re.sub(r"\s+", " ", t).strip()


def collect(levels):
    frases = {}
    for lvl in levels:
        base = ROOT / f"src/content/lessons/es/{lvl}"
        for f in sorted(base.rglob("*.md")):
            m = re.match(r"^---\n(.*?)\n---\n", f.read_text(encoding="utf-8"), re.S)
            if not m:
                continue
            fm = lenient_yaml(m.group(1))
            for ex in fm.get("exercises") or []:
                items = ex.get("cards") if ex.get("type") == "flashcards" else \
                        ex.get("pairs") if ex.get("type") == "match-pairs" else None
                for it in items or []:
                    # sufijos y morfemas sueltos («-(e)ko», «-lako») no son
                    # frases pronunciables: el TTS devuelve vacío — fuera
                    if it["eu"].strip().startswith("-"):
                        continue
                    frases.setdefault(norm_key(it["eu"]), it["eu"])
    return frases


class DailyQuota(RuntimeError):
    """La cuota DIARIA del modelo (100 req/día) se agotó: parar limpio y resumir mañana."""


def synth_raw(prompt: str, model: str) -> bytes:
    """Una petición TTS → WAV. Distingue el 429 por-minuto (reintenta) del
    por-día (aborta la corrida: el script es resumible)."""
    body = json.dumps({
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {
            "responseModalities": ["AUDIO"],
            "speechConfig": {"voiceConfig": {"prebuiltVoiceConfig": {"voiceName": VOICE}}},
        },
    }).encode()
    req = urllib.request.Request(
        f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={KEY}",
        data=body, headers={"Content-Type": "application/json"})
    for attempt in range(4):
        try:
            r = json.load(urllib.request.urlopen(req, timeout=580))
            part = r["candidates"][0]["content"]["parts"][0]["inlineData"]
            pcm = base64.b64decode(part["data"])
            m = re.search(r"rate=(\d+)", part["mimeType"])
            rate = int(m.group(1)) if m else 24000
            return (b"RIFF" + struct.pack("<I", 36 + len(pcm)) + b"WAVEfmt " +
                    struct.pack("<IHHIIHH", 16, 1, 1, rate, rate * 2, 2, 16) +
                    b"data" + struct.pack("<I", len(pcm)) + pcm)
        except urllib.error.HTTPError as e:
            if e.code == 429:
                try:
                    msg = json.load(e).get("error", {}).get("message", "")
                except Exception:  # noqa: BLE001
                    msg = ""
                if "per_day" in msg or "PerDay" in msg:
                    raise DailyQuota(msg.splitlines()[0][:120])
                if attempt < 3:
                    time.sleep((20, 45, 90)[attempt])
                    continue
            elif e.code in (500, 503) and attempt < 3:
                time.sleep((10, 25, 60)[attempt])
                continue
            raise
        except (KeyError, IndexError):
            raise RuntimeError("respuesta sin audio")
    raise RuntimeError("agotados los reintentos")


# ── modo LOTE: N frases por petición, corte por silencios, auto-validado ──
BATCH_PROMPT = ("Read the following Basque vocabulary phrases slowly and clearly, "
                "one by one, leaving a clear one second silent pause between each "
                "phrase. Do not read anything else:\n\n")


def detect_segments(wav: pathlib.Path, n_expected: int):
    """Corte por silencios con BARRIDO de umbral: el TTS deja ~2-6s entre
    frases pero también pausa dentro de ellas («bat, bi, hiru» → hasta ~1.2s),
    así que un umbral fijo no vale. Se detectan todos los silencios ≥0.3s UNA
    vez y se prueba qué umbral separa EXACTAMENTE n tramos. None si ninguno."""
    out = subprocess.run(
        ["ffmpeg", "-i", str(wav), "-af", "silencedetect=noise=-32dB:d=0.3",
         "-f", "null", "-"], capture_output=True, text=True).stderr
    starts = [float(x) for x in re.findall(r"silence_start: ([\d.]+)", out)]
    ends = [float(x) for x in re.findall(r"silence_end: ([\d.]+)", out)]
    dur_m = re.search(r"Duration: (\d+):(\d+):([\d.]+)", out)
    total = int(dur_m.group(1)) * 3600 + int(dur_m.group(2)) * 60 + float(dur_m.group(3))
    if len(ends) == len(starts) - 1:
        ends.append(total)
    silences = list(zip(starts, ends))

    for th in (2.4, 2.0, 2.8, 1.6, 3.2, 1.2, 0.9):
        seps = [(s, e) for s, e in silences if e - s >= th]
        speech, cur = [], 0.0
        for s, e in seps:
            if s - cur > 0.12:
                speech.append((cur, s))
            cur = e
        if cur < total - 0.12:
            speech.append((cur, total))
        if len(speech) == n_expected:
            return speech
    return None


def synth_batch(textos, model, out_files):
    """True si el lote entero quedó cortado y guardado; False si no cuadró."""
    prompt = BATCH_PROMPT + "\n\n".join(tts_text(t) for t in textos)
    wav_tmp = OUT_DIR / "_batch.wav"
    wav_tmp.write_bytes(synth_raw(prompt, model))
    segs = detect_segments(wav_tmp, len(textos))
    if segs is None:
        wav_tmp.unlink(missing_ok=True)
        return False
    pad = 0.12
    for (ini, fin), mp3 in zip(segs, out_files):
        subprocess.run(
            ["ffmpeg", "-loglevel", "error", "-y", "-i", str(wav_tmp),
             "-ss", f"{max(0, ini - pad):.3f}", "-to", f"{fin + pad:.3f}",
             "-ac", "1", "-b:a", "64k", str(mp3)], check=True)
    wav_tmp.unlink(missing_ok=True)
    return True


def dur_of(mp3: pathlib.Path) -> float:
    out = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration",
                          "-of", "csv=p=0", str(mp3)], capture_output=True, text=True)
    try:
        return float(out.stdout.strip())
    except ValueError:
        return 0.0


def save_manifest(manifest):
    MANIFEST.write_text(json.dumps(manifest, ensure_ascii=False, indent=0, sort_keys=True),
                        encoding="utf-8")


def make_batches(items, max_n=14, max_chars=300):
    """Lotes por nº y por presupuesto de caracteres (audio <~60s por petición)."""
    batches, cur, chars = [], [], 0
    for k, t in items:
        if cur and (len(cur) >= max_n or chars + len(t) > max_chars):
            batches.append(cur)
            cur, chars = [], 0
        cur.append((k, t))
        chars += len(t)
    if cur:
        batches.append(cur)
    return batches


def run(todo_items, manifest, model):
    """Cola de lotes con bisección si el corte por silencios no cuadra.
    Devuelve (hechas, fallos_duros, cuota_agotada)."""
    queue = make_batches(todo_items)
    hechas = fails = req = 0
    t0 = time.time()
    while queue:
        lote = queue.pop(0)
        files = [OUT_DIR / (hashlib.sha1(k.encode()).hexdigest()[:12] + ".mp3")
                 for k, _ in lote]
        try:
            req += 1
            if len(lote) == 1:
                k, texto = lote[0]
                wav_tmp = OUT_DIR / "_single.wav"
                wav_tmp.write_bytes(synth_raw(tts_text(texto), model))
                subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-i", str(wav_tmp),
                                "-ac", "1", "-b:a", "64k", str(files[0])], check=True)
                wav_tmp.unlink()
                manifest[k] = files[0].name
                hechas += 1
            elif synth_batch([t for _, t in lote], model, files):
                for (k, _), f in zip(lote, files):
                    manifest[k] = f.name
                hechas += len(lote)
            else:
                # el corte no cuadró: bisecar y reintentar (coste: 1 req extra)
                mid = len(lote) // 2
                queue.insert(0, lote[mid:])
                queue.insert(0, lote[:mid])
                print(f"  ↺ lote de {len(lote)} no cuadra el corte → bisecado", flush=True)
        except DailyQuota as e:
            save_manifest(manifest)
            print(f"\n⏸ CUOTA DIARIA agotada tras {req} peticiones hoy: {e}", flush=True)
            print(f"  hechas en esta corrida: {hechas} · re-lanzar tras el reset "
                  f"(el manifest resume solo)", flush=True)
            return hechas, fails, True
        except Exception as e:  # noqa: BLE001
            fails += len(lote)
            print(f"  ✗ lote de {len(lote)} («{lote[0][1]}»…): {e}", flush=True)
        save_manifest(manifest)
        if req % 5 == 0:
            rate = hechas / max(time.time() - t0, 1) * 60
            print(f"  {hechas} frases · {req} req · {rate:.0f} frases/min", flush=True)
        time.sleep(6)  # el límite por minuto del preview también existe
    return hechas, fails, False


def main():
    levels = [a for a in sys.argv[1:] if not a.startswith("--")] or ["a1", "a2"]
    model = MODEL
    for a in sys.argv[1:]:
        if a.startswith("--model="):
            model = a.split("=", 1)[1]
    frases = collect(levels)
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    manifest = json.load(open(MANIFEST)) if MANIFEST.exists() else {}

    todo = {k: v for k, v in frases.items()
            if k not in manifest or not (OUT_DIR / manifest[k]).exists()}
    print(f"frases: {len(frases)} · ya hechas: {len(frases) - len(todo)} · "
          f"pendientes: {len(todo)} · modelo: {model}", flush=True)

    hechas, fails, quota = run(sorted(todo.items()), manifest, model)
    chars = sum(len(v) for v in todo.values())

    MANIFEST.write_text(json.dumps(manifest, ensure_ascii=False, indent=0, sort_keys=True),
                        encoding="utf-8")

    # ── cordura: duraciones (yo no tengo oídos; esto acota lo revisable) ──
    flagged = []
    durs = []
    for k, fname in manifest.items():
        p = OUT_DIR / fname
        if not p.exists():
            continue
        d = dur_of(p)
        durs.append(d)
        expected = 0.5 + len(k) * 0.07  # ~14 chars/seg de habla pausada
        if d < 0.35 or d > expected * 3 + 2:
            flagged.append({"texto": frases.get(k, k), "fichero": fname, "seg": round(d, 2)})
    FLAGGED.write_text(json.dumps(flagged, ensure_ascii=False, indent=1), encoding="utf-8")

    total_mb = sum((OUT_DIR / f).stat().st_size for f in manifest.values()
                   if (OUT_DIR / f).exists()) / 1e6
    print(f"\n{'⏸' if quota else '✓'} manifest: {len(manifest)} audios · {total_mb:.1f} MB · "
          f"hechas ahora: {hechas} · fallos: {fails} · chars pendientes al inicio: {chars}")
    print(f"  duración media {sum(durs)/max(len(durs),1):.2f}s · sospechosos: {len(flagged)} "
          f"(→ {FLAGGED.relative_to(ROOT)})")
    if quota:
        sys.exit(75)  # EX_TEMPFAIL: re-lanzar tras el reset de cuota
    if fails:
        sys.exit(1)


if __name__ == "__main__":
    main()
