<script lang="ts">
  // Ahoskera-gimnasioa (BETA) — mintzamena a coste CERO y privacidad total:
  // el reconocedor corre EN EL NAVEGADOR (transformers.js, WASM). El audio
  // del usuario JAMÁS sale de su dispositivo.
  //
  // Truco de hosting: CF Pages rechaza ficheros >25MB, así que el decoder
  // (30MB) viaja partido en dos .part; antes de arrancar el motor los
  // recomponemos y los sembramos en la Cache API bajo la URL exacta que
  // transformers.js pedirá — el motor los encuentra "descargados" y nunca
  // toca la red externa.
  //
  // El veredicto compara la transcripción con la frase OBJETIVO (sabemos qué
  // debe decir): palabras reconocidas, en positivo. No puntúa el examen.
  import { onDestroy } from 'svelte';
  import audioManifest from '../../data/audio-eu.json';
  import { t, tf } from '../../i18n/ui';
  import type { LocaleCode } from '../../i18n/config';

  export let locale: LocaleCode = 'es';

  const M = audioManifest as Record<string, string>;
  // whisper-tiny FINE-TUNED en euskera (zuazo, Common Voice 13, Apache-2.0):
  // el A/B del 06-ago sobre 115 clips propios bajó el WER≈78% del tiny
  // genérico a ≈43% con el MISMO peso de descarga.
  const MODEL_BASE = '/models/whisper-tiny-eu';
  const DECODER_URL = `${MODEL_BASE}/onnx/decoder_model_merged_uint8.onnx`;

  type Phase = 'idle' | 'loading' | 'ready' | 'recording' | 'thinking' | 'result' | 'error';
  // client:only → window existe en init
  let phase: Phase = 'idle';
  let loadMsg = '';
  let errMsg = '';
  let transcriber: any = null;

  // ── frases: 10 al azar del banco con audio de referencia ──
  const ALL = Object.keys(M).filter((k) => k.split(' ').length >= 2 && k.length >= 8 && !k.startsWith('ls-'));
  function pick10(): string[] {
    const a = [...ALL];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a.slice(0, 10);
  }
  let phrases = pick10();
  let idx = 0;
  $: target = phrases[idx];

  let heard = '';
  let hits: boolean[] = [];
  let refAudio: HTMLAudioElement | null = null;
  let myUrl: string | null = null;
  // Captura PCM cruda (nada de MediaRecorder: en iOS produce MP4 fragmentado
  // que decodeAudioData rechaza con EncodingError)
  let recCtx: AudioContext | null = null;
  let recStream: MediaStream | null = null;
  let recNode: AudioWorkletNode | ScriptProcessorNode | null = null;
  let recSrc: MediaStreamAudioSourceNode | null = null;
  let pcmChunks: Float32Array[] = [];

  const norm = (s: string) =>
    s.normalize('NFD').toLowerCase().split(/\s+/).map((w) => w.replace(/[^a-z0-9ñ]/g, '')).filter(Boolean);

  async function primeCache() {
    // transformers.js busca en SU caché ('transformers-cache') con la URL
    // ABSOLUTA como clave — sembrar exactamente ahí o el motor re-descarga
    // (y el decoder entero no existe como fichero: está partido).
    const cache = await caches.open('transformers-cache');
    const absUrl = new URL(DECODER_URL, location.origin).href;
    if (await cache.match(absUrl)) return;
    loadMsg = t(locale, 'gym.load.download');
    const parts = await Promise.all(
      [`${MODEL_BASE}/decoder_00.part`, `${MODEL_BASE}/decoder_01.part`].map(async (u) => {
        const r = await fetch(u);
        if (!r.ok) throw new Error(`fetch ${u}: ${r.status}`);
        return r.arrayBuffer();
      }),
    );
    const blob = new Blob(parts, { type: 'application/octet-stream' });
    const resp = new Response(blob, {
      status: 200,
      headers: { 'Content-Type': 'application/octet-stream', 'Content-Length': String(blob.size) },
    });
    await cache.put(absUrl, resp.clone());
    await cache.put(DECODER_URL, resp);   // clave relativa también, por si acaso
  }

  async function initEngine() {
    phase = 'loading';
    errMsg = '';
    try {
      await primeCache();
      loadMsg = t(locale, 'gym.load.start');
      const t2 = await import('@huggingface/transformers');
      // allowLocalModels arranca en false en algunos entornos (WKWebView de
      // la app iOS incluido): con remote también apagado, el motor no tiene
      // de dónde tirar — «both local and remote models are disabled».
      t2.env.allowLocalModels = true;
      t2.env.allowRemoteModels = false;
      t2.env.localModelPath = '/models';
      t2.env.useBrowserCache = true;
      // WASM siempre (la ruleta WebGPU rompía en headless/dispositivos raros)
      // y runtime ONNX auto-alojado: CERO peticiones a CDNs externos.
      t2.env.backends.onnx.wasm.wasmPaths = '/ort/';
      transcriber = await t2.pipeline('automatic-speech-recognition', 'whisper-tiny-eu', {
        dtype: { encoder_model: 'q8', decoder_model_merged: 'uint8' },
        device: 'wasm',
      });
      phase = 'ready';
    } catch (e) {
      errMsg = `${e}`.slice(0, 200);
      phase = 'error';
    }
  }

  function playRef() {
    refAudio?.pause();
    refAudio = new Audio(`/audio/eu/${M[target]}`);
    refAudio.play().catch(() => {});
  }
  function playMine() {
    if (myUrl) new Audio(myUrl).play().catch(() => {});
  }

  const WORKLET_SRC = `class P extends AudioWorkletProcessor {
    process(inputs) { const c = inputs[0]?.[0]; if (c) this.port.postMessage(c.slice()); return true; }
  } registerProcessor('pcm-tap', P);`;

  async function startRec() {
    try {
      recStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      recCtx = new AudioContext();               // rate nativo del dispositivo
      pcmChunks = [];
      recSrc = recCtx.createMediaStreamSource(recStream);
      try {
        const url = URL.createObjectURL(new Blob([WORKLET_SRC], { type: 'application/javascript' }));
        await recCtx.audioWorklet.addModule(url);
        URL.revokeObjectURL(url);
        const node = new AudioWorkletNode(recCtx, 'pcm-tap');
        node.port.onmessage = (e) => pcmChunks.push(e.data);
        recSrc.connect(node);
        recNode = node;
      } catch {
        // Fallback: ScriptProcessor (viejuno pero universal)
        const sp = recCtx.createScriptProcessor(4096, 1, 1);
        sp.onaudioprocess = (e) => pcmChunks.push(new Float32Array(e.inputBuffer.getChannelData(0)));
        recSrc.connect(sp);
        sp.connect(recCtx.destination);
        recNode = sp;
      }
      phase = 'recording';
    } catch (e: any) {
      errMsg = e?.name === 'NotFoundError'
        ? t(locale, 'gym.err.mic.none')
        : t(locale, 'gym.err.mic.denied');
      phase = 'error';
    }
  }

  function stopRec() {
    if (!recCtx) return;
    const rate = recCtx.sampleRate;
    try { recSrc?.disconnect(); recNode?.disconnect(); } catch {}
    recStream?.getTracks().forEach((tr) => tr.stop());
    recCtx.close();
    recCtx = null; recNode = null; recSrc = null; recStream = null;
    const total = pcmChunks.reduce((a, c) => a + c.length, 0);
    const raw = new Float32Array(total);
    let off = 0;
    for (const c of pcmChunks) { raw.set(c, off); off += c.length; }
    pcmChunks = [];
    analyze(raw, rate);
  }

  function wavFromFloat32(raw: Float32Array, rate: number): Blob {
    const len = raw.length;
    const buf = new ArrayBuffer(44 + len * 2);
    const v = new DataView(buf);
    const ws = (o: number, s: string) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
    ws(0, 'RIFF'); v.setUint32(4, 36 + len * 2, true); ws(8, 'WAVE'); ws(12, 'fmt ');
    v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
    v.setUint32(24, rate, true); v.setUint32(28, rate * 2, true); v.setUint16(32, 2, true);
    v.setUint16(34, 16, true); ws(36, 'data'); v.setUint32(40, len * 2, true);
    for (let i = 0; i < len; i++) {
      const s = Math.max(-1, Math.min(1, raw[i]));
      v.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    }
    return new Blob([buf], { type: 'audio/wav' });
  }

  async function resampleTo16k(raw: Float32Array, rate: number): Promise<Float32Array> {
    if (rate === 16000) return raw;
    const off = new OfflineAudioContext(1, Math.ceil((raw.length * 16000) / rate), 16000);
    const b = off.createBuffer(1, raw.length, rate);
    b.copyToChannel(raw, 0);
    const src = off.createBufferSource();
    src.buffer = b;
    src.connect(off.destination);
    src.start();
    const rendered = await off.startRendering();
    return rendered.getChannelData(0);
  }

  async function analyze(raw: Float32Array, rate: number) {
    phase = 'thinking';
    if (myUrl) URL.revokeObjectURL(myUrl);
    myUrl = URL.createObjectURL(wavFromFloat32(raw, rate));
    try {
      if (raw.length < rate * 0.3) throw new Error(t(locale, 'gym.err.short'));
      const mono = await resampleTo16k(raw, rate);
      const out = await transcriber(mono, { language: 'basque', task: 'transcribe' });
      heard = (out?.text ?? '').trim();
      const tw = norm(target);
      const hw = new Set(norm(heard));
      hits = tw.map((w) => hw.has(w) || [...hw].some((h) => h.length > 2 && (w.includes(h) || h.includes(w))));
      phase = 'result';
    } catch (e) {
      errMsg = tf(locale, 'gym.err.analyze', `${e}`.slice(0, 120));
      phase = 'error';
    }
  }

  function next() {
    idx = (idx + 1) % phrases.length;
    heard = ''; hits = []; myUrl = null;
    phase = 'ready';
  }
  function reshuffle() {
    phrases = pick10(); idx = 0; heard = ''; hits = []; myUrl = null;
    if (phase === 'result') phase = 'ready';
  }

  $: nOk = hits.filter(Boolean).length;
  $: verdict =
    hits.length === 0 ? '' :
    nOk === hits.length ? t(locale, 'gym.v.all') :
    nOk >= Math.ceil(hits.length * 0.6) ? t(locale, 'gym.v.most') :
    nOk > 0 ? t(locale, 'gym.v.some') :
    t(locale, 'gym.v.none');

  onDestroy(() => { refAudio?.pause(); if (myUrl) URL.revokeObjectURL(myUrl); });
</script>

<div class="gym">
  {#if phase === 'idle'}
    <div class="card intro">
      <p>{t(locale, 'gym.how')}</p>
      <p class="fine">{t(locale, 'gym.first')}</p>
      <button class="btn btn-primary" on:click={initEngine}>🚀 {t(locale, 'gym.start')}</button>
    </div>
  {:else if phase === 'loading'}
    <div class="card"><p class="pulse">⏳ {loadMsg}</p></div>
  {:else if phase === 'error'}
    <div class="card">
      <p>😕 {errMsg}</p>
      <p class="fine">{t(locale, 'gym.mirror')}</p>
      <button class="btn btn-secondary" on:click={initEngine}>{t(locale, 'gym.retry')}</button>
    </div>
  {:else}
    <div class="card">
      <p class="counter">{tf(locale, 'gym.counter', idx + 1, phrases.length)}</p>
      <p class="phrase">{target}</p>
      <div class="row">
        <button class="btn btn-secondary" on:click={playRef}>🔊 {t(locale, 'gym.ref')}</button>
        {#if phase === 'ready' || phase === 'result'}
          <button class="btn btn-primary" on:click={startRec}>🎙️ {phase === 'result' ? t(locale, 'gym.again') : t(locale, 'gym.rec')}</button>
        {:else if phase === 'recording'}
          <button class="btn btn-primary rec" on:click={stopRec}>⏹ {t(locale, 'gym.stop')}</button>
        {:else}
          <button class="btn btn-primary" disabled>🧠 {t(locale, 'gym.analyzing')}</button>
        {/if}
        {#if myUrl && phase === 'result'}
          <button class="btn btn-secondary" on:click={playMine}>▶ {t(locale, 'gym.mine')}</button>
        {/if}
      </div>

      {#if phase === 'result'}
        <div class="result">
          <p class="words">
            {#each target.split(/\s+/) as w, i}
              <span class:ok={hits[i]} class:ko={!hits[i]}>{w}</span>
            {/each}
          </p>
          <p class="score">{tf(locale, 'gym.score', nOk, hits.length)} · {verdict}</p>
          {#if heard}<p class="heard">{tf(locale, 'gym.heard', heard)}</p>{/if}
        </div>
      {/if}
    </div>
    <div class="row foot">
      <button class="btn btn-secondary" on:click={next}>{t(locale, 'gym.next')}</button>
      <button class="btn btn-secondary" on:click={reshuffle}>🎲 {t(locale, 'gym.reshuffle')}</button>
    </div>
  {/if}
</div>

<style>
  .gym { display: grid; gap: var(--s-4); }
  .card {
    border: 1px solid var(--c-border); border-radius: var(--r-lg);
    padding: var(--s-5); display: grid; gap: var(--s-3); background: var(--c-bg-alt);
  }
  .intro p { margin: 0; line-height: 1.6; }
  .warn {
    background: var(--c-red-soft); border-left: 3px solid var(--c-red);
    border-radius: var(--r-sm); padding: var(--s-2) var(--s-3); font-size: 0.92rem;
  }
  .fine { color: var(--c-text-muted); font-size: 0.9rem; }
  .pulse { animation: pulse 1.4s ease-in-out infinite; }
  @keyframes pulse { 50% { opacity: 0.55; } }
  .counter { color: var(--c-text-muted); font-size: 0.85rem; margin: 0; }
  .phrase { font-size: 1.5rem; font-weight: 700; margin: 0; }
  .row { display: flex; gap: var(--s-3); flex-wrap: wrap; align-items: center; }
  .row.foot { justify-content: space-between; }
  .rec { animation: pulse 1s ease-in-out infinite; }
  .result { display: grid; gap: var(--s-2); }
  .words { display: flex; gap: var(--s-2); flex-wrap: wrap; font-size: 1.2rem; font-weight: 700; margin: 0; }
  .words .ok { color: var(--c-green-strong); }
  .words .ko { color: var(--c-red-strong); text-decoration: underline wavy; }
  .score { margin: 0; }
  .heard { color: var(--c-text-muted); font-style: italic; font-size: 0.9rem; margin: 0; }
</style>
