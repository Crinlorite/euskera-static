<script lang="ts">
  // Generador procedural de simulacros A1 (v3: multi-idioma). Banco POR LOCALE
  // (a1.<loc>.json, import dinámico → cada idioma solo carga el suyo) +
  // blueprint fijo: la ESTRUCTURA del examen nunca se sortea (2 lecturas de
  // tipos distintos, gramática con cuota mínima por categoría, tarjetas, 2 de
  // emparejar, 2 escrituras de tipos distintos); solo se sortea el CONTENIDO.
  // Misma semilla → mismo examen (la URL ?s= es compartible); botón → semilla
  // nueva. El euskera del banco es idéntico en los 18 locales (paridad por
  // construcción); lo vehicular viene ya localizado del build.
  import { onMount } from 'svelte';
  import MultipleChoice from './MultipleChoice.svelte';
  import FillInBlank from './FillInBlank.svelte';
  import Flashcards from './Flashcards.svelte';
  import MatchPairs from './MatchPairs.svelte';
  import { haptic } from '../../lib/platform';
  import { t, tf } from '../../i18n/ui';
  import type { LocaleCode } from '../../i18n/config';

  export let locale: LocaleCode = 'es';

  const BANKS = import.meta.glob('../../data/bank/a1.*.json');
  let bank: any = null;
  onMount(async () => {
    const key = `../../data/bank/a1.${locale}.json`;
    const load = BANKS[key] ?? BANKS['../../data/bank/a1.es.json'];
    bank = ((await load()) as any).default;
  });

  type Rnd = () => number;
  type GrItem = {
    id: string; type: 'mc' | 'fill'; cat: string; unit: string; prompt: string;
    explanation: string; options?: string[]; answer?: number; answers?: string[];
  };

  // ── PRNG con semilla (mulberry32) ──
  function mulberry32(a: number): Rnd {
    return () => {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function seedToInt(s: string): number {
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }
  function newSeed(): string {
    const buf = new Uint32Array(1);
    crypto.getRandomValues(buf);
    return buf[0].toString(36).padStart(6, '0').slice(0, 6);
  }

  function shuffle<T>(arr: T[], rnd: Rnd): T[] {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(rnd() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
  const sample = <T,>(arr: T[], n: number, rnd: Rnd): T[] => shuffle(arr, rnd).slice(0, n);

  // Baraja las opciones de un MC y remapea la respuesta — el sesgo de
  // posición muere aquí, en runtime.
  function shuffleMc<T extends { options?: string[]; answer?: number }>(q: T, rnd: Rnd): T {
    if (!q.options) return q;
    const idx = shuffle(q.options.map((_, i) => i), rnd);
    return { ...q, options: idx.map((i) => q.options![i]), answer: idx.indexOf(q.answer!) };
  }

  function generate(bk: any, seedStr: string) {
    const rnd = mulberry32(seedToInt(seedStr));
    const bp = bk.blueprint;

    // Entzumena: 1 audio (rota por semilla), 4 preguntas barajadas
    const ls = shuffle(bk.listenings, rnd)[0] as any;
    const listening = {
      ...ls,
      questions: sample(ls.questions, bp.entzumena.questionsPer, rnd).map((q: any) => shuffleMc(q, rnd)),
    };

    // Irakurmena: 2 lecturas de tipos distintos, 3 preguntas cada una
    const rs = shuffle(bk.readings as any[], rnd);
    const r1 = rs[0];
    const r2 = rs.find((r) => r.kind !== r1.kind) ?? rs[1];
    const readings = [r1, r2].map((r) => ({
      ...r,
      questions: sample(r.questions, bp.irakurmena.questionsPer, rnd).map((q: any) => shuffleMc(q, rnd)),
    }));

    // Gramatika: cuota mínima por categoría + relleno libre
    const byCat: Record<string, GrItem[]> = {};
    for (const it of bk.items as GrItem[]) (byCat[it.cat] ??= []).push(it);
    const picked: GrItem[] = [];
    const used = new Set<string>();
    for (const [cat, min] of Object.entries(bp.gramatika.minPerCat)) {
      for (const it of sample(byCat[cat] ?? [], min as number, rnd)) {
        picked.push(it); used.add(it.id);
      }
    }
    const rest = (bk.items as GrItem[]).filter((i) => !used.has(i.id));
    picked.push(...sample(rest, bp.gramatika.total - picked.length, rnd));
    const gramatika = shuffle(picked, rnd).map((it) => (it.type === 'mc' ? shuffleMc(it, rnd) : it));

    // Hiztegia: tarjetas del pool global + 2 sets de parejas ATÓMICOS
    // (recortados a 6: un subconjunto de un set coherente sigue siéndolo)
    const cards = sample(bk.cards, bp.hiztegia.cards, rnd);
    const pairSets = sample(bk.pairSets as any[], bp.hiztegia.pairSets, rnd).map((s) => ({
      ...s,
      pairs: sample(s.pairs, Math.min(bp.hiztegia.pairsPerSet, s.pairs.length), rnd),
    }));

    // Idazmena: 2 tareas de tipos distintos
    const ws = shuffle(bk.writings as any[], rnd);
    const w1 = ws[0];
    const w2 = ws.find((w) => w.kind !== w1.kind) ?? ws[1];

    return { listening, readings, gramatika, cards, pairSets, writings: [w1, w2] };
  }

  // ── estado ──
  let seed = new URLSearchParams(location.search).get('s') || newSeed();
  history.replaceState(null, '', `?s=${seed}`);

  $: exam = bank ? generate(bank, seed) : null;

  let auto: Record<string, number> = {};       // id → puntos automáticos
  let texts: Record<string, string> = {};
  let showModel: Record<string, boolean> = {};

  // ── corrección automática de idazmena (reglas del banco, en vivo) ──
  type Rule =
    | { kind: 'sentences'; n: number }
    | { kind: 'any'; re: string[]; min?: number }
    | { kind: 'all'; re: string[] }
    | { kind: 'phoneWords'; n: number }
    | { kind: 'noSpanish' };

  // Chivatos de castellano: tildes/¿¡ o palabras-función que el euskera no
  // tiene. La ñ NO está (Iruñea, Begoña…) ni "al" (partícula interrogativa eu).
  const ES_HINTS = /[áéíóú¿¡]/i;
  const ES_WORDS = /\b(el|la|los|las|un|una|de|del|que|y|es|soy|estoy|tengo|vivo|llamo|con|para|por|pero|muy|hola|gracias|años|anos|trabajo|casa|me gusta)\b/i;

  function evalRule(rule: Rule, raw: string): boolean {
    const text = (raw ?? '').toLowerCase().replace(/\s+/g, ' ').trim();
    if (!text) return false;
    switch (rule.kind) {
      case 'sentences':
        return raw.split(/[.!?;\n·]+/)
          .filter((s) => s.trim().split(/\s+/).filter(Boolean).length >= 2).length >= rule.n;
      case 'any':
        return rule.re.filter((p) => new RegExp(p, 'u').test(text)).length >= (rule.min ?? 1);
      case 'all':
        return rule.re.every((p) => new RegExp(p, 'u').test(text));
      case 'phoneWords':
        return (text.match(/\b(zero|bat|bi|hiru|lau|bost|sei|zazpi|zortzi|bederatzi|hamar)\b/g)?.length ?? 0) >= rule.n;
      case 'noSpanish':
        return !ES_HINTS.test(raw) && !ES_WORDS.test(text);
      default:
        return false;
    }
  }

  const onPoint = (e: CustomEvent<{ exerciseId: string; score: number }>) => {
    auto[e.detail.exerciseId] = e.detail.score === 100 ? 1 : 0;
  };
  const onCards = (e: CustomEvent<{ exerciseId: string; score: number }>) => {
    auto[e.detail.exerciseId] = e.detail.score >= 75 ? 1 : 0;
  };
  const onPairs = (e: CustomEvent<{ exerciseId: string; score: number }>) => {
    auto[e.detail.exerciseId] = e.detail.score >= 70 ? 0.5 : 0;
  };

  // ── entzumena: 2 escuchas máximo (como el examen real); transcripción
  //    visible solo tras responder sus 4 preguntas ──
  let lsPlays = 0;
  let lsPlaying = false;
  let lsShowTranscript = false;
  let lsAudio: HTMLAudioElement | null = null;
  $: lsMax = bank?.blueprint.entzumena.plays ?? 2;
  $: lsAnswered = exam ? exam.listening.questions.every((q: any) => auto[q.id] !== undefined) : false;

  function playListening() {
    if (!exam || lsPlays >= lsMax || lsPlaying) return;
    lsPlays += 1;
    lsPlaying = true;
    lsAudio?.pause();
    lsAudio = new Audio(`/audio/eu/${exam.listening.audio}`);
    lsAudio.onended = () => { lsPlaying = false; };
    lsAudio.onerror = () => { lsPlaying = false; };
    lsAudio.play().catch(() => { lsPlaying = false; });
  }

  const AUTO_N = 4 + 6 + 8 + 1 + 2; // entzumena + lectura + gramática + tarjetas + 2 parejas
  $: autoTotal = Object.values(auto).reduce((a, b) => a + b, 0);
  $: writeTotal = exam ? exam.writings.reduce(
    (a: number, w: any) => a + w.checks.filter((c: any) => evalRule(c.rule as Rule, texts[w.id] ?? '')).length, 0) : 0;
  $: total = Math.round((autoTotal + writeTotal) * 10) / 10;
  $: pending = AUTO_N - Object.keys(auto).length;

  // Fallos de gramática → unidades a repasar, con nombre y enlace
  $: failedUnits = (() => {
    if (!exam) return [] as Array<[string, number]>;
    const m = new Map<string, number>();
    for (const it of exam.gramatika) if (auto[it.id] === 0) m.set(it.unit, (m.get(it.unit) ?? 0) + 1);
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  })();
  $: failedReading = exam ? exam.readings.reduce(
    (a: number, r: any) => a + r.questions.filter((q: any) => auto[q.id] === 0).length, 0) : 0;
  $: failedListening = exam ? exam.listening.questions.filter((q: any) => auto[q.id] === 0).length : 0;

  function regen() {
    seed = newSeed();
    auto = {}; texts = {}; showModel = {};
    lsAudio?.pause();
    lsPlays = 0; lsPlaying = false; lsShowTranscript = false;
    history.replaceState(null, '', `?s=${seed}`);
    haptic('light');
    scrollTo({ top: 0, behavior: 'smooth' });
  }

  const KIND_LABEL: Record<string, string> = {
    pertsona: 'testua', mezua: 'mezua', iragarkia: 'iragarkia',
  };
  const fails = (n: number) => (n === 1 ? t(locale, 'sim.fail.one') : tf(locale, 'sim.fails', n));
</script>

<div class="sim">
  <header class="sim-head">
    <p class="sim-seed">Simulakroa <strong>#{seed}</strong> — {t(locale, 'sim.seed')}</p>
    <table class="sim-tbl">
      <thead><tr><th>Atala</th><th>{t(locale, 'sim.tbl.what')}</th><th>{t(locale, 'sim.tbl.points')}</th></tr></thead>
      <tbody>
        <tr><td>1 · Entzumena</td><td>{t(locale, 'sim.tbl.r1')}</td><td>4</td></tr>
        <tr><td>2 · Irakurmena</td><td>{t(locale, 'sim.tbl.r2')}</td><td>6</td></tr>
        <tr><td>3 · Gramatika eta hiztegia</td><td>{t(locale, 'sim.tbl.r3')}</td><td>10</td></tr>
        <tr><td>4 · Idazmena</td><td>{t(locale, 'sim.tbl.r4')}</td><td>10</td></tr>
        <tr class="sim-tot"><td><strong>Guztira</strong></td><td>{t(locale, 'sim.tbl.total')}</td><td><strong>30</strong></td></tr>
      </tbody>
    </table>
    <p class="sim-note">{t(locale, 'sim.note')}</p>
  </header>

  {#if !exam}
    <section class="atala"><p class="sim-loading">⏳ {t(locale, 'sim.loading')}</p></section>
  {:else}
  {#key seed}
    <section class="atala">
      <h2>🎧 1 · Entzumena</h2>
      <article class="listening">
        <h3>{exam.listening.title}</h3>
        <div class="ls-player">
          <button class="btn btn-primary" on:click={playListening}
            disabled={lsPlays >= lsMax || lsPlaying}>
            {lsPlaying ? t(locale, 'sim.play.playing') : lsPlays >= lsMax ? t(locale, 'sim.play.out') : `▶ Entzun · ${lsMax - lsPlays}`}
          </button>
          <span class="ls-hint">{tf(locale, 'sim.play.hint', lsMax)}</span>
        </div>
        {#each exam.listening.questions as q (q.id)}
          <MultipleChoice id={q.id} prompt={q.prompt} options={q.options} answer={q.answer}
            explanation={q.explanation} {locale} on:result={onPoint} />
        {/each}
        {#if lsAnswered}
          <button class="btn btn-secondary ls-tr-btn" on:click={() => (lsShowTranscript = !lsShowTranscript)}>
            {lsShowTranscript ? 'Ezkutatu transkripzioa' : '📜 Erakutsi transkripzioa'}
          </button>
          {#if lsShowTranscript}
            <div class="ls-transcript">
              {#each exam.listening.transcriptEu.split('\n') as line}
                <p>{line}</p>
              {/each}
            </div>
          {/if}
        {/if}
      </article>
    </section>

    <section class="atala">
      <h2>📖 2 · Irakurmena</h2>
      {#each exam.readings as r, ri}
        <article class="reading">
          <h3>{ri + 1}. {KIND_LABEL[r.kind] ?? 'testua'} — {r.title}</h3>
          <div class="reading-text">{@html r.html}</div>
          {#each r.questions as q (q.id)}
            <MultipleChoice id={q.id} prompt={q.prompt} options={q.options} answer={q.answer}
              explanation={q.explanation} {locale} on:result={onPoint} />
          {/each}
        </article>
      {/each}
    </section>

    <section class="atala">
      <h2>✏️ 3 · Gramatika eta hiztegia</h2>
      {#each exam.gramatika as it (it.id)}
        {#if it.type === 'mc'}
          <MultipleChoice id={it.id} prompt={it.prompt} options={it.options} answer={it.answer}
            explanation={it.explanation} {locale} on:result={onPoint} />
        {:else}
          <FillInBlank id={it.id} prompt={it.prompt} answers={it.answers}
            explanation={it.explanation} {locale} on:result={onPoint} />
        {/if}
      {/each}
      <h3 class="hiz-h">Hiztegia</h3>
      <Flashcards id="sim-fc" cards={exam.cards} {locale} on:result={onCards} />
      {#each exam.pairSets as ps (ps.id)}
        <MatchPairs id={ps.id} pairs={ps.pairs} {locale} on:result={onPairs} />
      {/each}
    </section>

    <section class="atala">
      <h2>🖊️ 4 · Idazmena</h2>
      {#each exam.writings as w, wi (w.id)}
        <article class="writing">
          <h3>{wi + 1}. ataza — {w.title} <span class="pts">({t(locale, 'sim.write.points')})</span></h3>
          <p class="w-task">{@html w.task}</p>
          <textarea rows="6" placeholder="Idatzi hemen…" bind:value={texts[w.id]}></textarea>
          <button class="btn btn-secondary w-toggle"
            on:click={() => { showModel[w.id] = !showModel[w.id]; }}>
            {showModel[w.id] ? 'Ezkutatu eredua' : 'Erakutsi eredua'}
          </button>
          {#if showModel[w.id]}
            <div class="w-model">{@html w.model}</div>
          {/if}
          <p class="w-rubric-h">{t(locale, 'sim.write.rubric')}</p>
          <ul class="w-rubric">
            {#each w.checks as c (c.label)}
              {@const ok = evalRule(c.rule, texts[w.id] ?? '')}
              <li class:ok>
                <span class="w-mark" aria-hidden="true">{ok ? '✓' : '✗'}</span>
                <span>{c.label}</span>
              </li>
            {/each}
          </ul>
        </article>
      {/each}
    </section>
  {/key}

  <section class="verdict" class:done={pending === 0}>
    <h2>🎯 {t(locale, 'sim.verdict.title')}</h2>
    {#if pending > 0}
      <p class="v-pending">{tf(locale, 'sim.verdict.pending', pending, total, autoTotal, writeTotal)}</p>
    {:else}
      <p class="v-score"><strong>{total} / 30</strong></p>
      {#if total >= 24}
        <p class="v-msg ok">{t(locale, 'sim.verdict.ok')}</p>
      {:else if total >= 18}
        <p class="v-msg mid">{t(locale, 'sim.verdict.mid')}</p>
      {:else}
        <p class="v-msg low">{t(locale, 'sim.verdict.low')}</p>
      {/if}
      {#if failedUnits.length > 0}
        <p class="v-rep-h">{t(locale, 'sim.verdict.units')}</p>
        <ul class="v-rep">
          {#each failedUnits as [unit, n]}
            <li><a href={`/${locale}/a1/${unit}/`}>{bank.unitTitles[unit] ?? unit}</a>
              <span class="v-n">{fails(n)}</span></li>
          {/each}
        </ul>
      {/if}
      {#if failedReading > 0}
        <p class="v-read">Irakurmena: {fails(failedReading)} — {t(locale, 'sim.verdict.read')}</p>
      {/if}
      {#if failedListening > 0}
        <p class="v-read">Entzumena: {fails(failedListening)} — {t(locale, 'sim.verdict.listen')}</p>
      {/if}
    {/if}
    <button class="btn btn-primary v-regen" on:click={regen}>🎲 Beste simulakro bat sortu</button>
  </section>
  {/if}
</div>

<style>
  .sim { display: grid; gap: var(--s-6); }
  .sim-head { display: grid; gap: var(--s-4); }
  .sim-seed { color: var(--c-text-muted); font-size: 0.95rem; }
  .sim-seed strong { color: var(--c-red); font-variant-numeric: tabular-nums; }
  .sim-loading { color: var(--c-text-muted); }
  .sim-tbl { width: 100%; border-collapse: collapse; font-size: 0.95rem; }
  .sim-tbl th, .sim-tbl td {
    text-align: left; padding: var(--s-2) var(--s-3);
    border-bottom: 1px solid var(--c-border);
  }
  .sim-tbl th { color: var(--c-text-muted); font-weight: 600; }
  .sim-tbl td:last-child, .sim-tbl th:last-child { text-align: right; }
  .sim-tot td { border-bottom: none; }
  .sim-note {
    font-size: 0.9rem; color: var(--c-text-muted);
    background: var(--c-bg-muted); border-radius: var(--r-md); padding: var(--s-3) var(--s-4);
  }

  .atala { display: grid; gap: var(--s-4); }
  .atala h2 {
    border-bottom: 3px solid var(--c-green);
    padding-bottom: var(--s-2); margin-top: var(--s-4);
  }
  .hiz-h { margin-top: var(--s-4); }

  .reading { display: grid; gap: var(--s-4); }
  .reading h3 { color: var(--c-green-strong); }

  .listening { display: grid; gap: var(--s-4); }
  .listening h3 { color: var(--c-green-strong); }
  .ls-player { display: flex; align-items: center; gap: var(--s-4); flex-wrap: wrap; }
  .ls-hint { color: var(--c-text-muted); font-size: 0.88rem; }
  .ls-tr-btn { justify-self: start; }
  .ls-transcript {
    background: var(--c-bg-cream); border-left: 4px solid var(--c-green);
    border-radius: var(--r-md); padding: var(--s-4) var(--s-5);
    display: grid; gap: var(--s-2); line-height: 1.6; font-style: italic;
  }
  .ls-transcript p { margin: 0; }
  .reading-text {
    background: var(--c-bg-cream); border-left: 4px solid var(--c-green);
    border-radius: var(--r-md); padding: var(--s-4) var(--s-5);
    display: grid; gap: var(--s-3); font-size: 1.02rem; line-height: 1.65;
  }

  .writing { display: grid; gap: var(--s-3); }
  .writing h3 { color: var(--c-red-strong); }
  .pts { color: var(--c-text-muted); font-weight: 400; font-size: 0.9rem; }
  .w-task { line-height: 1.6; }
  textarea {
    width: 100%; padding: var(--s-3); border: 1px solid var(--c-border-strong);
    border-radius: var(--r-md); font: inherit; resize: vertical; background: var(--c-bg);
  }
  textarea:focus { outline: 2px solid var(--c-green); border-color: transparent; }
  .w-toggle { justify-self: start; }
  .w-model {
    background: var(--c-green-soft); border-radius: var(--r-md);
    padding: var(--s-3) var(--s-4); line-height: 1.6;
  }
  .w-rubric-h { font-size: 0.9rem; color: var(--c-text-muted); margin-top: var(--s-2); }
  .w-rubric { list-style: none; padding: 0; display: grid; gap: var(--s-2); }
  .w-rubric li { display: flex; gap: var(--s-2); align-items: baseline; color: var(--c-text-muted); }
  .w-rubric li.ok { color: var(--c-text); }
  .w-mark { font-weight: 700; color: var(--c-red-strong); min-width: 1em; }
  li.ok .w-mark { color: var(--c-green-strong); }

  .verdict {
    border: 2px dashed var(--c-border-strong); border-radius: var(--r-md);
    padding: var(--s-5); display: grid; gap: var(--s-3); justify-items: start;
  }
  .verdict.done { border-style: solid; border-color: var(--c-green); }
  .v-score { font-size: 2.2rem; }
  .v-score strong { color: var(--c-green-strong); }
  .v-msg.ok { color: var(--c-green-strong); }
  .v-msg.low { color: var(--c-red-strong); }
  .v-rep { list-style: none; padding: 0; display: grid; gap: var(--s-1); }
  .v-rep a { color: var(--c-red-strong); font-weight: 600; }
  .v-n { color: var(--c-text-muted); font-size: 0.85rem; margin-left: var(--s-2); }
  .v-read, .v-pending { color: var(--c-text-muted); }
  .v-regen { margin-top: var(--s-2); }
</style>
