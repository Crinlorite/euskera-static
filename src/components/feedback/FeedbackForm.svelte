<script lang="ts">
  import { onMount, onDestroy } from 'svelte';

  // Site key de Cloudflare Turnstile (opcional). Si no está definida en
  // env vars (PUBLIC_TURNSTILE_SITE_KEY), el widget no se renderiza y el
  // form sigue siendo funcional. La verificación server-side también es
  // opcional (TURNSTILE_SECRET en CF Pages settings).
  const TURNSTILE_SITE_KEY = (import.meta.env.PUBLIC_TURNSTILE_SITE_KEY as string | undefined) ?? '';

  type FeedbackType = 'bug' | 'feature' | 'question' | 'language' | 'pedagogy';

  const TYPES: { id: FeedbackType; icon: string; label: string; desc: string }[] = [
    { id: 'bug',      icon: '🐛', label: 'Algo no funciona', desc: 'Bug en la web' },
    { id: 'feature',  icon: '✨', label: 'Sugerencia',        desc: 'Idea o mejora' },
    { id: 'question', icon: '💬', label: 'Pregunta',          desc: '¿Cómo funciona X?' },
    { id: 'language', icon: '🌐', label: 'Traducción',        desc: 'Error en el texto de UI' },
    { id: 'pedagogy', icon: '📚', label: 'Contenido',         desc: 'Error en una lección' },
  ];

  declare global {
    interface Window {
      turnstile?: {
        render: (el: HTMLElement, opts: Record<string, unknown>) => string;
        remove: (id: string) => void;
        reset: (id: string) => void;
      };
    }
  }

  let type: FeedbackType = 'bug';
  let title = '';
  let description = '';
  let email = '';
  let discordUser = '';
  let website = ''; // honeypot
  let turnstileToken = '';
  let submitting = false;
  let error = '';
  let result: { publicId: string; threadUrl: string | null } | null = null;

  let turnstileEl: HTMLDivElement | null = null;
  let widgetId: string | null = null;

  function renderTurnstile() {
    if (!TURNSTILE_SITE_KEY || !window.turnstile || !turnstileEl || widgetId) return;
    widgetId = window.turnstile.render(turnstileEl, {
      sitekey: TURNSTILE_SITE_KEY,
      theme: 'light',
      callback: (t: string) => (turnstileToken = t),
      'error-callback': () => (turnstileToken = ''),
      'expired-callback': () => (turnstileToken = ''),
    });
  }

  function resetTurnstile() {
    if (window.turnstile && widgetId) {
      try { window.turnstile.reset(widgetId); } catch { /* ignore */ }
    }
    turnstileToken = '';
  }

  onMount(() => {
    if (!TURNSTILE_SITE_KEY) return;
    const SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    if (window.turnstile) {
      renderTurnstile();
      return;
    }
    const existing = document.querySelector(`script[src^="${SRC}"]`);
    if (existing) {
      existing.addEventListener('load', renderTurnstile, { once: true });
      return;
    }
    const s = document.createElement('script');
    s.src = SRC;
    s.async = true;
    s.defer = true;
    s.onload = renderTurnstile;
    document.head.appendChild(s);
  });

  onDestroy(() => {
    if (window.turnstile && widgetId) {
      try { window.turnstile.remove(widgetId); } catch { /* ignore */ }
      widgetId = null;
    }
  });

  async function handleSubmit(e: Event) {
    e.preventDefault();
    if (submitting) return;
    error = '';

    if (website) {
      // Honeypot: bots rellenan este campo invisible.
      result = { publicId: 'EU-XXXX', threadUrl: null };
      return;
    }

    const t = title.trim();
    const d = description.trim();
    if (t.length < 5) { error = 'El título debe tener al menos 5 caracteres.'; return; }
    if (d.length < 20) { error = 'La descripción debe tener al menos 20 caracteres.'; return; }
    if (TURNSTILE_SITE_KEY && !turnstileToken) { error = 'Completa la verificación anti-bot.'; return; }

    submitting = true;
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          title: t,
          description: d,
          email: email.trim() || null,
          discordUser: discordUser.trim() || null,
          turnstileToken,
          context: {
            url: typeof location !== 'undefined' ? location.pathname : '',
            userAgent: typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 200) : '',
          },
        }),
      });

      if (res.status === 503) {
        error = 'El sistema de tickets está temporalmente desactivado. Inténtalo más tarde.';
        return;
      }
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        error = body?.error?.message || 'No se pudo enviar el ticket.';
        resetTurnstile();
        return;
      }
      const data = (await res.json()) as { publicId: string; threadUrl: string | null };
      result = { publicId: data.publicId, threadUrl: data.threadUrl };
      title = '';
      description = '';
      email = '';
      discordUser = '';
      resetTurnstile();
    } catch {
      error = 'Error de red.';
      resetTurnstile();
    } finally {
      submitting = false;
    }
  }

  function reset() {
    result = null;
    error = '';
  }
</script>

{#if result}
  <div class="success-card">
    <div class="check" aria-hidden="true">
      <svg viewBox="0 0 32 32" width="48" height="48"><path d="M6 17 l6 6 l14 -14" stroke="currentColor" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>
    </div>
    <h2 class="display">¡Eskerrik asko!</h2>
    <p class="success-sub">Tu ticket queda registrado.</p>
    <div class="ticket-id" aria-label="Identificador del ticket">{result.publicId}</div>
    <p class="success-foot">
      {#if email}
        Te avisaremos por email cuando lo trabajemos.
      {:else if discordUser}
        Te avisaremos por mensaje directo en Discord.
      {:else}
        Guarda este ID si quieres seguir el progreso.
      {/if}
    </p>
    {#if result.threadUrl}
      <a class="btn btn-secondary" href={result.threadUrl} target="_blank" rel="noopener">
        Abrir hilo en Discord
      </a>
    {/if}
    <button type="button" class="btn btn-primary" on:click={reset}>Enviar otro</button>
  </div>
{:else}
  <form class="form" on:submit={handleSubmit}>
    <fieldset class="types">
      <legend class="sr-only">Tipo de ticket</legend>
      {#each TYPES as tt}
        <label class="type-card" class:selected={type === tt.id}>
          <input
            type="radio"
            name="ticket-type"
            value={tt.id}
            bind:group={type}
            class="sr-only"
          />
          <span class="type-icon" aria-hidden="true">{tt.icon}</span>
          <span class="type-label">{tt.label}</span>
          <span class="type-desc">{tt.desc}</span>
        </label>
      {/each}
    </fieldset>

    <label class="field">
      <span class="field-label">Título <span class="required">*</span></span>
      <input
        type="text"
        bind:value={title}
        maxlength="200"
        placeholder="Resume el asunto en una frase"
        required
      />
      <span class="counter">{title.length}/200</span>
    </label>

    <label class="field">
      <span class="field-label">Descripción <span class="required">*</span></span>
      <textarea
        bind:value={description}
        maxlength="4000"
        rows="8"
        placeholder="Pasos para reproducir, lo que esperabas, lo que pasó…"
        required
      ></textarea>
      <span class="counter">{description.length}/4000</span>
    </label>

    <div class="contact">
      <label class="field">
        <span class="field-label">Email <span class="optional">(opcional)</span></span>
        <input
          type="email"
          bind:value={email}
          maxlength="120"
          placeholder="tu@email.com"
        />
      </label>
      <label class="field">
        <span class="field-label">Usuario Discord <span class="optional">(opcional)</span></span>
        <input
          type="text"
          bind:value={discordUser}
          maxlength="40"
          placeholder="tunick"
        />
      </label>
    </div>

    <p class="contact-note">
      Te avisaremos cuando se resuelva. Si lo dejas en blanco, queda anónimo.
    </p>

    <div class="honeypot" aria-hidden="true">
      <label>Website (déjalo vacío)
        <input
          type="text"
          name="website"
          bind:value={website}
          tabindex="-1"
          autocomplete="off"
        />
      </label>
    </div>

    {#if TURNSTILE_SITE_KEY}
      <div bind:this={turnstileEl} class="turnstile"></div>
    {/if}

    {#if error}
      <p class="error" role="alert">{error}</p>
    {/if}

    <button
      type="submit"
      class="btn btn-primary submit"
      disabled={submitting || (!!TURNSTILE_SITE_KEY && !turnstileToken)}
    >
      {submitting ? 'Enviando…' : 'Enviar ticket'}
    </button>
  </form>
{/if}

<style>
  .form {
    display: grid;
    gap: var(--s-5);
    max-inline-size: 720px;
  }

  .types {
    border: 0;
    margin: 0;
    padding: 0;
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
    gap: var(--s-3);
  }
  .type-card {
    display: grid;
    gap: var(--s-1);
    padding: var(--s-4);
    border: 2px solid var(--c-border);
    border-radius: var(--r-md);
    background: var(--c-bg);
    cursor: pointer;
    transition: border-color var(--m-base) var(--ease-out), background var(--m-base) var(--ease-out), transform var(--m-base) var(--ease-out);
  }
  .type-card:hover { border-color: var(--c-border-strong); transform: translateY(-1px); }
  .type-card.selected {
    border-color: var(--c-red);
    background: var(--c-red-soft);
  }
  .type-icon { font-size: 1.6rem; line-height: 1; }
  .type-label { font-weight: 700; font-size: 0.95rem; color: var(--c-text); }
  .type-desc { font-size: 0.78rem; color: var(--c-text-muted); }

  .field {
    display: grid;
    gap: var(--s-1);
    position: relative;
  }
  .field-label {
    font-size: 0.85rem;
    font-weight: 600;
    color: var(--c-text);
  }
  .required { color: var(--c-red); }
  .optional { color: var(--c-text-muted); font-weight: 400; }
  .field input,
  .field textarea {
    inline-size: 100%;
    padding: var(--s-3) var(--s-4);
    border: 1px solid var(--c-border);
    border-radius: var(--r-md);
    background: var(--c-bg);
    color: var(--c-text);
    font-family: inherit;
    font-size: 0.95rem;
    line-height: 1.5;
    transition: border-color var(--m-base) var(--ease-out), box-shadow var(--m-base) var(--ease-out);
  }
  .field input:focus,
  .field textarea:focus {
    outline: none;
    border-color: var(--c-text);
    box-shadow: 0 0 0 3px rgba(199, 25, 28, 0.12);
  }
  .field textarea { resize: vertical; min-block-size: 160px; }
  .counter {
    position: absolute;
    inset-block-end: var(--s-2);
    inset-inline-end: var(--s-3);
    font-size: 0.7rem;
    color: var(--c-text-dim);
    pointer-events: none;
    background: var(--c-bg);
    padding: 0 var(--s-1);
  }

  .contact {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--s-3);
  }
  @media (max-width: 540px) {
    .contact { grid-template-columns: 1fr; }
  }
  .contact-note {
    margin: 0;
    color: var(--c-text-muted);
    font-size: 0.85rem;
    line-height: 1.5;
  }

  .honeypot {
    position: absolute;
    inset-inline-start: -10000px;
    inline-size: 1px;
    block-size: 1px;
    overflow: hidden;
  }

  .turnstile { min-block-size: 65px; }

  .error {
    margin: 0;
    padding: var(--s-3) var(--s-4);
    background: rgba(199, 25, 28, 0.08);
    border: 1px solid var(--c-red);
    border-radius: var(--r-md);
    color: var(--c-red);
    font-size: 0.9rem;
    font-weight: 500;
  }

  .submit { padding-block: var(--s-4); font-size: 1rem; }

  /* ---------- Success ---------- */
  .success-card {
    display: grid;
    gap: var(--s-3);
    justify-items: center;
    text-align: center;
    padding: var(--s-7) var(--s-5);
    background: var(--c-bg);
    border: 2px solid var(--c-green-strong);
    border-radius: var(--r-md);
    max-inline-size: 540px;
  }
  .check {
    color: var(--c-green-strong);
    background: rgba(46, 139, 87, 0.12);
    inline-size: 80px;
    block-size: 80px;
    display: grid;
    place-items: center;
    border-radius: 50%;
  }
  .success-card h2 {
    margin: 0;
    font-size: clamp(1.6rem, 3vw, 2.2rem);
    line-height: 1.05;
  }
  .success-sub { margin: 0; color: var(--c-text-muted); }
  .ticket-id {
    font-family: ui-monospace, 'Cascadia Code', 'Fira Code', monospace;
    font-size: 1.4rem;
    font-weight: 700;
    color: var(--c-green-strong);
    background: rgba(46, 139, 87, 0.08);
    padding: var(--s-2) var(--s-5);
    border-radius: var(--r-md);
    letter-spacing: 0.1em;
  }
  .success-foot {
    margin: 0;
    color: var(--c-text-muted);
    font-size: 0.9rem;
    max-inline-size: 36ch;
  }
  .success-card .btn { min-inline-size: 200px; }

  .sr-only {
    position: absolute;
    inline-size: 1px; block-size: 1px;
    padding: 0; margin: -1px;
    overflow: hidden; clip: rect(0,0,0,0); white-space: nowrap; border: 0;
  }
</style>
