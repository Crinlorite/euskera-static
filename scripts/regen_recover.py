#!/usr/bin/env python3
"""Recuperación de la regeneración R2+pro tras el 429 de encolado:
1) cosecha los 2 jobs ya enviados (frases 0-800 del orden determinista),
2) procesa el resto EN SERIE (el tier pro limita jobs simultáneos),
   con backoff en el submit,
3) segunda pasada para negadas. Mismos ficheros, sobrescritura atómica."""
from __future__ import annotations

import json
import pathlib
import sys
import time
import urllib.error

sys.path.insert(0, str(pathlib.Path(__file__).parent))
from build_audio_bank import MANIFEST, OUT_DIR, FLAGGED, collect, dur_of
from regen_audio_r2pro import submit, wait, harvest, CARRIER, CARRIER2

ORPHANS = [
    "batches/1ylvmm4n2heklzz4gjzwj16lw0oecn5lx7mr",
    "batches/4qjqhfloelm12job7yih8vcswptmigk5m8xu",
]
CHUNK = 400


def submit_retry(chunk, carrier, tag):
    for wait_s in (0, 90, 240, 600):
        if wait_s:
            print(f"  [{tag}] submit 429 → espero {wait_s}s", flush=True)
            time.sleep(wait_s)
        try:
            return submit(chunk, carrier)
        except urllib.error.HTTPError as e:
            if e.code != 429:
                raise
    raise RuntimeError("submit agotado")


def main():
    frases = collect(["a1", "a2"])
    manifest = json.load(open(MANIFEST))
    items = sorted((k, v) for k, v in frases.items() if k in manifest)
    print(f"total {len(items)} · huérfanos cubren 0-800 · pendientes {len(items)-800}", flush=True)

    ok_total, refused = 0, []
    for job in ORPHANS:
        st = wait(job)
        if st.endswith("SUCCEEDED"):
            ok, ref = harvest(job, manifest)
            ok_total += ok
            refused += ref
            print(f"✓ huérfano {job}: {ok} · negadas {len(ref)}", flush=True)
        else:
            print(f"✗ huérfano {job}: {st} — sus 400 pasan a pendientes", flush=True)
            idx = ORPHANS.index(job)
            refused += [k for k, _ in items[idx * 400:(idx + 1) * 400]]

    rest = items[800:]
    for i in range(0, len(rest), CHUNK):
        chunk = rest[i:i + CHUNK]
        job = submit_retry(chunk, CARRIER, "serie")
        print(f"→ serie {job} ({len(chunk)})", flush=True)
        st = wait(job)
        if st.endswith("SUCCEEDED"):
            ok, ref = harvest(job, manifest)
            ok_total += ok
            refused += ref
            print(f"✓ serie: {ok} · negadas {len(ref)}", flush=True)
        else:
            print(f"✗ serie {job}: {st}", flush=True)
            refused += [k for k, _ in chunk]

    refused = [k for k in dict.fromkeys(refused) if k in frases]
    if refused:
        print(f"\n2ª pasada: {len(refused)}", flush=True)
        retry = [(k, frases[k]) for k in refused]
        still = []
        for i in range(0, len(retry), CHUNK):
            chunk = retry[i:i + CHUNK]
            job = submit_retry(chunk, CARRIER2, "p2")
            st = wait(job)
            if st.endswith("SUCCEEDED"):
                ok, ref = harvest(job, manifest)
                ok_total += ok
                still += ref
            else:
                still += [k for k, _ in chunk]
        refused = still

    flagged, durs = [], []
    for k, fname in manifest.items():
        p = OUT_DIR / fname
        if not p.exists():
            continue
        d = dur_of(p)
        durs.append(d)
        if d < 0.3 or d > (0.5 + len(k) * 0.07) * 3 + 2.5:
            flagged.append({"texto": frases.get(k, k), "fichero": fname, "seg": round(d, 2)})
    FLAGGED.write_text(json.dumps(flagged, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"\n{'✓' if not refused else '⚠'} regeneradas {ok_total}/{len(items)} · "
          f"irreductibles {len(refused)} {refused[:6]} · sospechosos {len(flagged)} · "
          f"media {sum(durs)/max(len(durs),1):.2f}s")
    if refused:
        sys.exit(1)


if __name__ == "__main__":
    main()
