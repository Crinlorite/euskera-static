<script lang="ts">
  import { onMount } from 'svelte';
  import { TURNSTILE_SITE_KEY } from '../../lib/turnstile';
  import { MARCA_INTERES, origenDe } from '../../lib/jolas.mjs';

  export let locale = 'es';
  export let textos: { boton: string; anotado: string; error: string; nota: string };

  // Solo intención: se manda el idioma y el origen, nada más. La marca en el
  // dispositivo evita contar dos veces a la misma persona.
  let estado: 'libre' | 'enviando' | 'anotado' | 'error' = 'libre';
  let cajaTurnstile: HTMLDivElement | null = null;

  onMount(() => {
    try { if (localStorage.getItem(MARCA_INTERES)) estado = 'anotado'; } catch { /* sin almacenamiento */ }
  });

  // La comprobación contra robots se carga y se ejecuta SOLO al pulsar: ver la
  // página no hace ninguna petición a Cloudflare Turnstile.
  function cargaTurnstile(): Promise<void> {
    const SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    return new Promise((resolve, reject) => {
      if (window.turnstile) { resolve(); return; }
      const s = document.createElement('script');
      s.src = SRC; s.async = true;
      s.onload = () => resolve();
      s.onerror = () => reject(new Error('turnstile'));
      document.head.appendChild(s);
    });
  }

  async function tokenTurnstile(): Promise<string> {
    if (!TURNSTILE_SITE_KEY) return '';
    await cargaTurnstile();
    return new Promise((resolve, reject) => {
      const tope = setTimeout(() => reject(new Error('turnstile')), 30000);
      window.turnstile!.render(cajaTurnstile!, {
        sitekey: TURNSTILE_SITE_KEY,
        theme: 'light',
        appearance: 'interaction-only',
        callback: (t: string) => { clearTimeout(tope); resolve(t); },
        'error-callback': () => { clearTimeout(tope); reject(new Error('turnstile')); },
      });
    });
  }

  async function pulsa() {
    if (estado === 'enviando' || estado === 'anotado') return;
    estado = 'enviando';
    try {
      const turnstileToken = await tokenTurnstile();
      const plataforma = (window as { Kaixo?: { platform?: string } }).Kaixo?.platform;
      const r = await fetch('/api/interes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ locale, origen: origenDe(plataforma), turnstileToken }),
      });
      if (!r.ok) throw new Error(String(r.status));
      try { localStorage.setItem(MARCA_INTERES, '1'); } catch { /* sin almacenamiento */ }
      estado = 'anotado';
    } catch {
      estado = 'error';
    }
  }
</script>

<div class="interes">
  {#if estado === 'anotado'}
    <p class="hecho" role="status">✓ {textos.anotado}</p>
  {:else}
    <button class="btn btn-primary" on:click={pulsa} disabled={estado === 'enviando'}>{textos.boton}</button>
    {#if estado === 'error'}<p class="fallo" role="alert">{textos.error}</p>{/if}
  {/if}
  <div bind:this={cajaTurnstile}></div>
  <p class="nota">{textos.nota}</p>
</div>

<style>
  .interes { display: grid; gap: var(--s-2); justify-items: start; }
  .hecho { margin: 0; font-weight: 600; color: var(--c-green); }
  .fallo { margin: 0; color: var(--c-red, #c0392b); font-size: 0.95rem; }
  .nota { margin: 0; font-size: 0.85rem; line-height: 1.5; color: var(--c-text-muted); }
</style>
