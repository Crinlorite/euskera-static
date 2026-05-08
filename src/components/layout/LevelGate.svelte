<script lang="ts">
  import { onMount } from 'svelte';

  // Niveles que requieren desbloqueo. A1 nunca está bloqueado.
  // El token vive en código cliente — esto es protección "casual visitor",
  // NO seguridad real. El propósito es evitar que alguien sin supervisión
  // humana llegue a contenido aún no validado pedagógicamente.
  const LOCKED_LEVELS = ['a2', 'b1', 'b2', 'c1', 'ega'];
  const TOKEN = 'crintechstudios1234';
  const STORAGE_PREFIX = 'euskera-static.gate.';

  let mounted = false;
  let currentLockedLevel: string | null = null;
  let input = '';
  let error = '';
  let revealed = false;

  function detectLockedLevel(pathname: string): string | null {
    // Match /es/<level>/... donde <level> está en LOCKED_LEVELS
    const m = pathname.match(/^\/[a-zA-Z-]+\/([a-z0-9]+)(?:\/|$)/);
    if (!m) return null;
    const lvl = m[1];
    return LOCKED_LEVELS.includes(lvl) ? lvl : null;
  }

  function isUnlocked(level: string): boolean {
    try {
      return localStorage.getItem(STORAGE_PREFIX + level) === '1';
    } catch {
      return false;
    }
  }

  function unlock(level: string) {
    try {
      localStorage.setItem(STORAGE_PREFIX + level, '1');
    } catch {
      /* fallthrough */
    }
  }

  function check() {
    const lvl = detectLockedLevel(location.pathname);
    if (!lvl) {
      currentLockedLevel = null;
      revealed = true;
      document.body.classList.remove('gate-locked');
      return;
    }
    if (isUnlocked(lvl)) {
      currentLockedLevel = null;
      revealed = true;
      document.body.classList.remove('gate-locked');
      return;
    }
    currentLockedLevel = lvl;
    revealed = false;
    document.body.classList.add('gate-locked');
  }

  function tryUnlock(e: Event) {
    e.preventDefault();
    if (!currentLockedLevel) return;
    if (input.trim() === TOKEN) {
      unlock(currentLockedLevel);
      revealed = true;
      currentLockedLevel = null;
      document.body.classList.remove('gate-locked');
      input = '';
      error = '';
    } else {
      error = 'Contraseña incorrecta.';
    }
  }

  onMount(() => {
    mounted = true;
    check();
    // Recheck on Astro view-transitions
    document.addEventListener('astro:page-load', check);
  });
</script>

{#if mounted && currentLockedLevel}
  <div class="gate" role="dialog" aria-modal="true" aria-labelledby="gate-title">
    <div class="gate-card">
      <p class="eyebrow">Acceso restringido</p>
      <h2 id="gate-title" class="display gate-title">
        Nivel <span class="text-grad">{currentLockedLevel.toUpperCase()}</span> en revisión
      </h2>
      <p class="gate-desc">
        Este nivel todavía está en validación pedagógica y no está disponible para acceso libre.
        Si tienes la contraseña de revisión, introdúcela para continuar.
      </p>

      <form on:submit={tryUnlock} class="gate-form">
        <label for="gate-pwd" class="sr-only">Contraseña de revisión</label>
        <input
          id="gate-pwd"
          type="password"
          bind:value={input}
          placeholder="Contraseña"
          autocomplete="off"
          autocapitalize="off"
          autocorrect="off"
          spellcheck="false"
        />
        <button class="btn btn-primary" type="submit">Desbloquear</button>
      </form>
      {#if error}
        <p class="gate-error" role="alert">{error}</p>
      {/if}

      <p class="gate-foot">
        Mientras tanto puedes seguir con
        <a href="/es/a1/">A1, completo y validado</a>.
      </p>
    </div>
  </div>
{/if}

<style>
  /* Globalmente: cuando la página está bloqueada, el contenido principal se oculta */
  :global(body.gate-locked main) { visibility: hidden; }
  :global(body.gate-locked .site-footer) { visibility: hidden; }

  .gate {
    position: fixed;
    inset: 0;
    background: rgba(255, 255, 255, 0.96);
    backdrop-filter: blur(2px);
    z-index: 200;
    display: grid;
    place-items: center;
    padding: var(--s-5);
    overflow-y: auto;
  }
  .gate-card {
    inline-size: 100%;
    max-inline-size: 540px;
    background: var(--c-bg);
    border: 1px solid var(--c-border);
    border-radius: var(--r-lg);
    padding: var(--s-7) var(--s-6);
    box-shadow: var(--sh-card-deep);
    text-align: center;
    display: grid;
    gap: var(--s-3);
  }
  .eyebrow {
    margin: 0;
    font-family: var(--ff-sans);
    font-size: var(--t-eyebrow);
    font-weight: 600;
    letter-spacing: var(--tr-wide);
    text-transform: uppercase;
    color: var(--c-text-muted);
  }
  .gate-title {
    font-family: var(--ff-display);
    font-size: clamp(1.8rem, 4vw, 2.6rem);
    line-height: 1.05;
    letter-spacing: var(--tr-tight);
    margin: 0;
  }
  .gate-title .text-grad {
    background: var(--grad-ikurri-text);
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
    -webkit-text-fill-color: transparent;
    font-style: italic;
  }
  .gate-desc {
    margin: 0;
    color: var(--c-text-muted);
    font-size: 0.95rem;
    line-height: 1.55;
  }
  .gate-form {
    display: grid;
    gap: var(--s-3);
    margin-block-start: var(--s-3);
  }
  input[type="password"] {
    inline-size: 100%;
    padding: var(--s-3) var(--s-4);
    border: 1px solid var(--c-border);
    border-radius: var(--r-md);
    font-size: 1rem;
    font-family: ui-monospace, monospace;
    text-align: center;
    letter-spacing: 0.15em;
  }
  input[type="password"]:focus {
    outline: 2px solid var(--c-text);
    outline-offset: 1px;
    border-color: var(--c-text);
  }
  .gate-error {
    color: var(--c-red);
    font-size: 0.9rem;
    margin: 0;
  }
  .gate-foot {
    margin: var(--s-3) 0 0;
    font-size: 0.85rem;
    color: var(--c-text-muted);
  }
  .gate-foot a { color: var(--c-red); font-weight: 600; }

  .sr-only {
    position: absolute;
    inline-size: 1px; block-size: 1px;
    padding: 0; margin: -1px;
    overflow: hidden; clip: rect(0,0,0,0); white-space: nowrap; border: 0;
  }
</style>
