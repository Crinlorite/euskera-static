<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { LANGUAGES, type LocaleCode } from '../../i18n/config';

  export let redirectTo: string = '/es/';
  export let countdownSeconds: number = 3;

  let countdown = countdownSeconds;
  let cancelled = false;
  let mounted = false;
  let prefersReduce = false;
  let interval: ReturnType<typeof setInterval> | null = null;
  let timeoutHandle: ReturnType<typeof setTimeout> | null = null;

  const all = Object.values(LANGUAGES);

  function startCountdown() {
    if (prefersReduce) {
      timeoutHandle = setTimeout(() => {
        if (!cancelled) window.location.href = redirectTo;
      }, 600);
      return;
    }
    interval = setInterval(() => {
      countdown -= 1;
      if (countdown <= 0) {
        if (interval) clearInterval(interval);
        if (!cancelled) window.location.href = redirectTo;
      }
    }, 1000);
  }

  onMount(() => {
    mounted = true;
    prefersReduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    startCountdown();
  });

  onDestroy(() => {
    if (interval) clearInterval(interval);
    if (timeoutHandle) clearTimeout(timeoutHandle);
  });

  function pickLocale(code: LocaleCode, status: string) {
    if (status === 'planned') return;
    cancelled = true;
    if (interval) clearInterval(interval);
    if (typeof document !== 'undefined') {
      document.cookie = `lang=${code}; path=/; max-age=31536000`;
    }
    window.location.href = `/${code}/`;
  }

  function cancelTimer() {
    cancelled = true;
    if (interval) clearInterval(interval);
    if (timeoutHandle) clearTimeout(timeoutHandle);
  }
</script>

<div class="wrap">
  <ul class="picker">
    {#each all as lang}
      {@const isActive = lang.status === 'active'}
      {@const isPlanned = lang.status === 'planned'}
      <li class:active={isActive} class:planned={isPlanned}>
        <button
          on:click={() => pickLocale(lang.code, lang.status)}
          disabled={isPlanned}
          aria-label={`Ir a ${lang.name}`}
        >
          <span class="name" dir={lang.dir}>{lang.name}</span>
          {#if isActive}
            <span class="arrow icon-direction-aware" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="18" height="18"><path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>
            </span>
          {/if}
          {#if isPlanned}
            <span class="badge">Próximamente</span>
          {/if}
        </button>
      </li>
    {/each}
  </ul>

  {#if mounted}
    <div class="countdown" class:hide={cancelled} aria-live="polite">
      {#if !cancelled && !prefersReduce}
        <span class="countdown-text">
          Vamos a Castellano en
          <strong class="countdown-num" data-n={countdown}>{Math.max(0, countdown)}</strong>
        </span>
        <button class="btn-cancel" on:click={cancelTimer} aria-label="Cancelar redirección">
          esperar
        </button>
      {:else if cancelled}
        <span class="countdown-text muted">Sin prisa. Selecciona arriba cuando quieras.</span>
      {/if}
    </div>
  {/if}
</div>

<style>
  .wrap { display: grid; gap: var(--s-6); margin-block-start: var(--s-5); }

  .picker {
    list-style: none; margin: 0; padding: 0;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
    gap: var(--s-3);
  }
  .picker button {
    inline-size: 100%;
    text-align: start;
    display: flex;
    align-items: center;
    gap: var(--s-3);
    padding: var(--s-4) var(--s-5);
    border: 1px solid var(--c-border);
    border-radius: var(--r-lg);
    background: var(--c-bg);
    box-shadow: var(--sh-card);
    transition: transform var(--m-base) var(--ease-out),
                border-color var(--m-base) var(--ease-out),
                box-shadow var(--m-base) var(--ease-out),
                background var(--m-base) var(--ease-out);
    min-block-size: 64px;
  }
  .picker button:hover:not([disabled]) {
    transform: translateY(-3px);
    border-color: var(--c-red);
    box-shadow: var(--sh-card-hover);
  }
  .picker button:hover:not([disabled]) .arrow { transform: translateX(6px); }

  .active button {
    border-color: var(--c-red);
    background: var(--c-red-soft);
  }
  .planned button {
    color: var(--c-text-dim);
    cursor: not-allowed;
    opacity: 0.7;
    box-shadow: none;
    background: var(--c-bg-alt);
  }

  .name { font-weight: 600; flex: 1; font-size: 1.1rem; }
  .arrow {
    color: var(--c-red);
    transition: transform var(--m-base) var(--ease-out);
  }
  .badge {
    margin-inline-start: auto;
    font-size: 0.7rem;
    font-weight: 600;
    letter-spacing: var(--tr-wide);
    text-transform: uppercase;
    padding: 2px 10px;
    border-radius: var(--r-pill);
    background: var(--c-bg-muted);
    color: var(--c-text-muted);
  }

  /* Countdown */
  .countdown {
    display: inline-flex;
    align-items: center;
    gap: var(--s-3);
    padding: var(--s-3) var(--s-5);
    background: var(--c-bg-alt);
    border: 1px solid var(--c-border);
    border-radius: var(--r-pill);
    color: var(--c-text-muted);
    font-size: 0.95rem;
    justify-self: center;
    transition: opacity var(--m-base) var(--ease-out);
  }
  .countdown.hide {
    opacity: 0.6;
  }
  .countdown-text { display: inline-flex; align-items: baseline; gap: var(--s-2); }
  .countdown-text.muted { color: var(--c-text-dim); }
  .countdown-num {
    font-family: var(--ff-display);
    font-style: italic;
    font-weight: 700;
    font-size: 1.6rem;
    line-height: 1;
    color: var(--c-red);
    min-inline-size: 1ch;
    display: inline-block;
    text-align: center;
    /* Pulse on each tick via animation key restart */
    animation: tick 700ms var(--ease-spring);
  }
  /* Re-trigger animation when number changes */
  .countdown-num[data-n] {
    animation: tick 700ms var(--ease-spring);
  }
  @keyframes tick {
    0%   { transform: scale(0.6); opacity: 0; }
    40%  { transform: scale(1.18); opacity: 1; color: var(--c-red); }
    100% { transform: scale(1); opacity: 1; }
  }
  .btn-cancel {
    padding: var(--s-1) var(--s-3);
    border: 1px solid var(--c-border-strong);
    border-radius: var(--r-pill);
    color: var(--c-text-muted);
    font-size: 0.85rem;
    transition: border-color var(--m-base) var(--ease-out),
                color var(--m-base) var(--ease-out),
                background var(--m-base) var(--ease-out);
  }
  .btn-cancel:hover {
    border-color: var(--c-text);
    color: var(--c-text);
    background: var(--c-bg);
  }

  @media (prefers-reduced-motion: reduce) {
    .countdown-num { animation: none; }
    .picker button:hover:not([disabled]) { transform: none; }
  }
</style>
