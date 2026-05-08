<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { Puzzle } from '../engine/types';

  export let puzzle: Puzzle;

  const dispatch = createEventDispatcher<{ result: { success: boolean } }>();

  // estado por tipo
  let mcChosen: number | null = null;
  let mcRevealed = false;

  let fillValue = '';
  let fillChecked = false;
  let fillCorrect = false;

  let orderPicks: number[] = []; // índices en orden seleccionado
  let orderChecked = false;
  let orderCorrect = false;

  // match: simple sequential pairing
  let leftSel: number | null = null;
  let rightSel: number | null = null;
  let matchSolved: boolean[] = [];
  let matchAttempted: boolean[] = [];

  let writeValue = '';
  let writeChecked = false;
  let writeOk = false;
  let writeFeedback = '';

  let compChosen: number | null = null;
  let compRevealed = false;

  $: resetForPuzzle(puzzle);

  function resetForPuzzle(p: Puzzle) {
    mcChosen = null; mcRevealed = false;
    fillValue = ''; fillChecked = false; fillCorrect = false;
    orderPicks = []; orderChecked = false; orderCorrect = false;
    leftSel = null; rightSel = null;
    if (p.type === 'match-pairs') {
      matchSolved = p.pairs.map(() => false);
      matchAttempted = p.pairs.map(() => false);
    }
    writeValue = ''; writeChecked = false; writeOk = false; writeFeedback = '';
    compChosen = null; compRevealed = false;
  }

  // ---------- multiple-choice ----------
  function pickMC(i: number) {
    if (mcRevealed) return;
    if (puzzle.type !== 'multiple-choice') return;
    mcChosen = i;
    mcRevealed = true;
  }
  function nextMC() {
    if (puzzle.type !== 'multiple-choice') return;
    const ok = mcChosen === puzzle.correctIndex;
    if (ok) {
      dispatch('result', { success: true });
    } else {
      // permitir reintentar
      mcRevealed = false;
      mcChosen = null;
    }
  }

  // ---------- fill-in ----------
  function checkFill() {
    if (puzzle.type !== 'fill-in') return;
    const v = fillValue.trim().toLowerCase();
    fillCorrect = puzzle.accept.some((a) => a.trim().toLowerCase() === v);
    fillChecked = true;
  }
  function nextFill() {
    if (fillCorrect) {
      dispatch('result', { success: true });
    } else {
      fillChecked = false;
      fillValue = '';
    }
  }

  // ---------- order-words ----------
  function orderToggle(i: number) {
    if (orderChecked) return;
    if (orderPicks.includes(i)) {
      orderPicks = orderPicks.filter((x) => x !== i);
    } else {
      orderPicks = [...orderPicks, i];
    }
  }
  function checkOrder() {
    if (puzzle.type !== 'order-words') return;
    if (orderPicks.length !== puzzle.words.length) return;
    orderCorrect = puzzle.correctOrder.every((v, idx) => v === orderPicks[idx]);
    orderChecked = true;
  }
  function nextOrder() {
    if (orderCorrect) {
      dispatch('result', { success: true });
    } else {
      orderChecked = false;
      orderPicks = [];
    }
  }

  // ---------- match-pairs ----------
  function matchSelect(side: 'left' | 'right', i: number) {
    if (puzzle.type !== 'match-pairs') return;
    if (matchSolved[i]) return;
    if (side === 'left') leftSel = i;
    else rightSel = i;
    if (leftSel !== null && rightSel !== null) {
      const ok = leftSel === rightSel;
      if (ok) {
        matchSolved[matchSolved.findIndex((v, idx) => idx === leftSel)] = true;
        matchSolved = [...matchSolved];
      } else {
        matchAttempted[leftSel] = true;
        matchAttempted = [...matchAttempted];
        setTimeout(() => {
          matchAttempted[leftSel as number] = false;
          matchAttempted = [...matchAttempted];
        }, 600);
      }
      leftSel = null;
      rightSel = null;
      if (matchSolved.every(Boolean)) {
        setTimeout(() => dispatch('result', { success: true }), 400);
      }
    }
  }

  // ---------- free-write ----------
  function checkWrite() {
    if (puzzle.type !== 'free-write') return;
    const text = writeValue.trim();
    const wordCount = text.split(/\s+/).filter(Boolean).length;
    if (wordCount < puzzle.minWords) {
      writeFeedback = `Necesitas al menos ${puzzle.minWords} palabras (llevas ${wordCount}).`;
      writeOk = false;
      writeChecked = true;
      return;
    }
    if (puzzle.maxWords && wordCount > puzzle.maxWords) {
      writeFeedback = `Demasiado largo. Máximo ${puzzle.maxWords} palabras (llevas ${wordCount}).`;
      writeOk = false;
      writeChecked = true;
      return;
    }
    if (puzzle.mustContain && puzzle.mustContain.length > 0) {
      const lower = text.toLowerCase();
      const missing = puzzle.mustContain.filter(
        (w) => !lower.includes(w.toLowerCase()),
      );
      if (missing.length > 0) {
        writeFeedback = `Falta usar: ${missing.join(', ')}.`;
        writeOk = false;
        writeChecked = true;
        return;
      }
    }
    writeFeedback = 'Bien escrito. La respuesta queda registrada.';
    writeOk = true;
    writeChecked = true;
  }
  function nextWrite() {
    if (writeOk) {
      dispatch('result', { success: true });
    } else {
      writeChecked = false;
      writeFeedback = '';
    }
  }

  // ---------- comprehension ----------
  function pickComp(i: number) {
    if (compRevealed) return;
    if (puzzle.type !== 'comprehension') return;
    compChosen = i;
    compRevealed = true;
  }
  function nextComp() {
    if (puzzle.type !== 'comprehension') return;
    if (compChosen === puzzle.correctIndex) {
      dispatch('result', { success: true });
    } else {
      compRevealed = false;
      compChosen = null;
    }
  }
</script>

<div class="puzzle">
  {#if puzzle.type === 'multiple-choice'}
    <p class="prompt">{puzzle.prompt}</p>
    {#if puzzle.promptEu}
      <p class="prompt-eu">{puzzle.promptEu}</p>
    {/if}
    <ul class="opts">
      {#each puzzle.options as opt, i}
        <li>
          <button
            class="opt"
            class:right={mcRevealed && i === puzzle.correctIndex}
            class:wrong={mcRevealed && mcChosen === i && i !== puzzle.correctIndex}
            disabled={mcRevealed}
            on:click={() => pickMC(i)}
          >
            <span class="letter">{String.fromCharCode(65 + i)}</span>
            <span>{opt}</span>
          </button>
        </li>
      {/each}
    </ul>
    {#if mcRevealed}
      {@const ok = mcChosen === puzzle.correctIndex}
      <div class="feedback" class:ok class:ko={!ok}>
        {#if ok && puzzle.explainCorrect}{puzzle.explainCorrect}{:else if !ok && puzzle.explainWrong}{puzzle.explainWrong}{:else if ok}Bien hecho.{:else}No es eso. Inténtalo otra vez.{/if}
        <button class="next" on:click={nextMC}>{ok ? 'Continuar →' : 'Reintentar'}</button>
      </div>
    {/if}

  {:else if puzzle.type === 'fill-in'}
    <p class="prompt">{puzzle.prompt}</p>
    <p class="fill-line">
      {puzzle.before}
      <input
        type="text"
        bind:value={fillValue}
        disabled={fillChecked && fillCorrect}
        autocomplete="off" autocapitalize="off" spellcheck="false"
        class:right={fillChecked && fillCorrect}
        class:wrong={fillChecked && !fillCorrect}
      />
      {puzzle.after}
    </p>
    {#if puzzle.hint}<p class="hint">Pista: {puzzle.hint}</p>{/if}
    {#if !fillChecked}
      <button class="action" on:click={checkFill} disabled={!fillValue.trim()}>Comprobar</button>
    {:else}
      <div class="feedback" class:ok={fillCorrect} class:ko={!fillCorrect}>
        {fillCorrect ? '¡Perfecto!' : `Aceptado: ${puzzle.accept[0]}`}
        <button class="next" on:click={nextFill}>{fillCorrect ? 'Continuar →' : 'Reintentar'}</button>
      </div>
    {/if}

  {:else if puzzle.type === 'order-words'}
    <p class="prompt">{puzzle.prompt}</p>
    <div class="order-target">
      {#if orderPicks.length === 0}
        <span class="placeholder">Pulsa las palabras en el orden correcto</span>
      {:else}
        {#each orderPicks as idx, posn}
          <button class="order-pill picked" on:click={() => orderToggle(idx)}>
            {posn + 1}. {puzzle.words[idx]}
          </button>
        {/each}
      {/if}
    </div>
    <div class="order-bank">
      {#each puzzle.words as word, i}
        {@const used = orderPicks.includes(i)}
        <button class="order-pill" disabled={used || orderChecked} on:click={() => orderToggle(i)}>{word}</button>
      {/each}
    </div>
    {#if !orderChecked}
      <button class="action" on:click={checkOrder} disabled={orderPicks.length !== puzzle.words.length}>Comprobar</button>
    {:else}
      <div class="feedback" class:ok={orderCorrect} class:ko={!orderCorrect}>
        {orderCorrect ? 'Frase bien construida.' : `La forma esperada: ${puzzle.correctOrder.map((j) => puzzle.words[j]).join(' ')}`}
        <button class="next" on:click={nextOrder}>{orderCorrect ? 'Continuar →' : 'Reintentar'}</button>
      </div>
    {/if}

  {:else if puzzle.type === 'match-pairs'}
    <p class="prompt">{puzzle.prompt}</p>
    <div class="match">
      <div class="match-col">
        {#each puzzle.pairs as p, i}
          <button
            class="match-cell"
            class:solved={matchSolved[i]}
            class:wrong={matchAttempted[i]}
            class:active={leftSel === i}
            disabled={matchSolved[i]}
            on:click={() => matchSelect('left', i)}
          >
            {p.left}
          </button>
        {/each}
      </div>
      <div class="match-col">
        {#each puzzle.pairs as p, i}
          <button
            class="match-cell"
            class:solved={matchSolved[i]}
            class:active={rightSel === i}
            disabled={matchSolved[i]}
            on:click={() => matchSelect('right', i)}
          >
            {p.right}
          </button>
        {/each}
      </div>
    </div>

  {:else if puzzle.type === 'free-write'}
    <p class="prompt">{puzzle.prompt}</p>
    <textarea
      rows="4"
      bind:value={writeValue}
      disabled={writeChecked && writeOk}
      placeholder="Escribe aquí…"
    ></textarea>
    {#if !writeChecked}
      <button class="action" on:click={checkWrite} disabled={!writeValue.trim()}>Enviar</button>
    {:else}
      <div class="feedback" class:ok={writeOk} class:ko={!writeOk}>
        {writeFeedback}
        {#if puzzle.acceptableExamples && !writeOk}
          <details class="examples">
            <summary>Ver ejemplo aceptable</summary>
            <ul>
              {#each puzzle.acceptableExamples as ex}<li>{ex}</li>{/each}
            </ul>
          </details>
        {/if}
        <button class="next" on:click={nextWrite}>{writeOk ? 'Continuar →' : 'Reintentar'}</button>
      </div>
    {/if}

  {:else if puzzle.type === 'comprehension'}
    <div class="passage">
      <p class="passage-eu">{puzzle.passageEu}</p>
      {#if puzzle.passageEs}
        <details class="translation">
          <summary>Ver traducción</summary>
          <p>{puzzle.passageEs}</p>
        </details>
      {/if}
    </div>
    <p class="prompt">{puzzle.question}</p>
    <ul class="opts">
      {#each puzzle.options as opt, i}
        <li>
          <button
            class="opt"
            class:right={compRevealed && i === puzzle.correctIndex}
            class:wrong={compRevealed && compChosen === i && i !== puzzle.correctIndex}
            disabled={compRevealed}
            on:click={() => pickComp(i)}
          >
            <span class="letter">{String.fromCharCode(65 + i)}</span>
            <span>{opt}</span>
          </button>
        </li>
      {/each}
    </ul>
    {#if compRevealed}
      {@const ok = compChosen === puzzle.correctIndex}
      <div class="feedback" class:ok class:ko={!ok}>
        {ok ? 'Correcto.' : 'No es esa. Relee el pasaje y prueba otra vez.'}
        <button class="next" on:click={nextComp}>{ok ? 'Continuar →' : 'Reintentar'}</button>
      </div>
    {/if}
  {/if}
</div>

<style>
  .puzzle {
    inline-size: 100%;
    padding: var(--s-5);
    background: rgba(15, 12, 8, 0.96);
    border: 2px solid #d4a017;
    border-radius: var(--r-md);
    color: #f0e6d0;
    display: grid;
    gap: var(--s-3);
  }
  .prompt {
    margin: 0;
    font-family: var(--ff-display);
    font-style: italic;
    font-size: 1.1rem;
    color: #d4a017;
  }
  .prompt-eu {
    margin: 0;
    color: #f0e6d0;
    font-weight: 600;
  }
  .opts { list-style: none; margin: 0; padding: 0; display: grid; gap: var(--s-2); }
  .opt {
    inline-size: 100%;
    text-align: start;
    display: grid;
    grid-template-columns: 28px 1fr;
    gap: var(--s-3);
    padding: var(--s-3) var(--s-4);
    background: rgba(40, 32, 22, 0.7);
    border: 1px solid #6a5a3a;
    border-radius: var(--r-sm);
    color: #f0e6d0;
    font-family: inherit;
    font-size: 0.95rem;
    cursor: pointer;
    transition: background 0.18s, border-color 0.18s, transform 0.18s;
  }
  .opt:hover:not(:disabled) { background: rgba(212, 160, 23, 0.14); border-color: #d4a017; transform: translateX(3px); }
  .opt .letter { font-family: var(--ff-display); color: #d4a017; font-weight: 700; }
  .opt.right { background: rgba(46, 139, 87, 0.18); border-color: #2e8b57; }
  .opt.wrong { background: rgba(199, 25, 28, 0.18); border-color: #c7191c; }

  .feedback {
    display: grid;
    gap: var(--s-2);
    padding: var(--s-3);
    border-radius: var(--r-sm);
    background: rgba(40, 32, 22, 0.5);
  }
  .feedback.ok { border: 1px solid #2e8b57; color: #b8e0c4; }
  .feedback.ko { border: 1px solid #c7191c; color: #f0c0c0; }
  .next, .action {
    justify-self: end;
    padding: var(--s-2) var(--s-4);
    background: #d4a017;
    color: #1a0e08;
    border: 0;
    border-radius: var(--r-sm);
    font-weight: 700;
    cursor: pointer;
    transition: background 0.18s;
  }
  .next:hover, .action:hover { background: #f0c038; }
  .action:disabled { opacity: 0.5; cursor: not-allowed; }

  .fill-line {
    margin: 0;
    line-height: 1.6;
    font-size: 1.05rem;
  }
  .fill-line input {
    background: rgba(40, 32, 22, 0.7);
    border: 1px solid #6a5a3a;
    border-bottom: 2px solid #d4a017;
    color: #f0e6d0;
    padding: 2px 8px;
    font-family: inherit;
    font-size: 1.05rem;
    margin-inline: 4px;
    min-inline-size: 8ch;
  }
  .fill-line input.right { border-color: #2e8b57; background: rgba(46, 139, 87, 0.18); }
  .fill-line input.wrong { border-color: #c7191c; background: rgba(199, 25, 28, 0.18); }
  .hint { margin: 0; font-size: 0.85rem; color: #a89c7a; font-style: italic; }

  .order-target, .order-bank {
    display: flex;
    flex-wrap: wrap;
    gap: var(--s-2);
    min-block-size: 44px;
    padding: var(--s-2);
    background: rgba(40, 32, 22, 0.4);
    border: 1px dashed #6a5a3a;
    border-radius: var(--r-sm);
  }
  .order-target .placeholder { color: #a89c7a; font-style: italic; padding: 8px; }
  .order-pill {
    padding: var(--s-2) var(--s-3);
    background: rgba(40, 32, 22, 0.8);
    border: 1px solid #6a5a3a;
    border-radius: var(--r-sm);
    color: #f0e6d0;
    font-family: inherit;
    cursor: pointer;
    transition: all 0.15s;
  }
  .order-pill:hover:not(:disabled) { border-color: #d4a017; }
  .order-pill.picked { border-color: #d4a017; background: rgba(212, 160, 23, 0.18); }
  .order-pill:disabled { opacity: 0.4; cursor: not-allowed; }

  .match {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--s-3);
  }
  .match-col { display: grid; gap: var(--s-2); }
  .match-cell {
    padding: var(--s-3);
    background: rgba(40, 32, 22, 0.7);
    border: 1px solid #6a5a3a;
    border-radius: var(--r-sm);
    color: #f0e6d0;
    font-family: inherit;
    cursor: pointer;
    transition: all 0.18s;
  }
  .match-cell:hover:not(:disabled) { border-color: #d4a017; }
  .match-cell.active { background: rgba(212, 160, 23, 0.22); border-color: #d4a017; }
  .match-cell.solved { background: rgba(46, 139, 87, 0.18); border-color: #2e8b57; opacity: 0.7; }
  .match-cell.wrong { background: rgba(199, 25, 28, 0.18); border-color: #c7191c; animation: shake 0.4s; }
  .match-cell:disabled { cursor: default; }
  @keyframes shake {
    0%, 100% { transform: translateX(0); }
    25% { transform: translateX(-4px); }
    75% { transform: translateX(4px); }
  }

  textarea {
    inline-size: 100%;
    min-block-size: 100px;
    padding: var(--s-3);
    background: rgba(40, 32, 22, 0.7);
    border: 1px solid #6a5a3a;
    border-radius: var(--r-sm);
    color: #f0e6d0;
    font-family: inherit;
    font-size: 0.95rem;
    line-height: 1.5;
    resize: vertical;
  }
  textarea:focus { outline: none; border-color: #d4a017; }

  .passage {
    padding: var(--s-3) var(--s-4);
    background: rgba(40, 32, 22, 0.5);
    border-inline-start: 3px solid #d4a017;
    border-radius: var(--r-sm);
  }
  .passage-eu { margin: 0; line-height: 1.6; font-size: 1rem; color: #f0e6d0; }
  .translation { margin-block-start: var(--s-2); font-size: 0.85rem; color: #a89c7a; }
  .translation summary { cursor: pointer; }

  .examples { font-size: 0.85rem; color: #a89c7a; }
  .examples summary { cursor: pointer; }
  .examples ul { padding-inline-start: var(--s-4); margin: var(--s-1) 0; }
</style>
