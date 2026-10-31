<script lang="ts">
  import { onDestroy, tick } from 'svelte';
  import { fly } from 'svelte/transition';
  import type { LocaleCode } from '../../i18n/config';
  import { t } from '../../i18n/ui';
  import { activeNavHref, ariaCurrentFor } from '../../lib/nav-active';

  export let locale: LocaleCode;
  /** Si el idioma tiene A2 (se calcula en la cabecera a partir de la colección). */
  export let conA2 = true;
  /** Ruta actual (Astro.url.pathname): marca la sección en el cajón. */
  export let current = '';
  /** Destino del enlace de idioma: el mismo que la píldora de la cabecera (?from=). */
  export let langHref = `/${locale}/idioma/`;
  /** Nombre corto del idioma actual (sin paréntesis). */
  export let langName = '';

  let open = false;
  let trigger: HTMLButtonElement | undefined;
  let closeBtn: HTMLButtonElement | undefined;

  type NavItem = { href: string; label?: string; key?: 'nav.home' | 'nav.about' | 'nav.language' | 'nav.progress' | 'review.title' | 'hiz.title' };
  // `satisfies` sobre el literal (mismo patrón que Header.astro): la anotación de
  // items no llega al array a través de .filter(), y sin tipo contextual
  // 'nav.home' se ensanchaba a string (ya no era StringKey).
  const items: NavItem[] = ([
    { href: `/${locale}/`, key: 'nav.home' },
    { href: `/${locale}/a1/`, label: 'A1' },
    { href: `/${locale}/a2/`, label: 'A2' },
    { href: `/${locale}/hiztegia/`, key: 'hiz.title' },
    { href: `/${locale}/progreso/`, key: 'nav.progress' },
    { href: `/${locale}/repaso/`, key: 'review.title' },
  ] satisfies NavItem[]).filter((i) => i.href !== `/${locale}/a2/` || conA2);
  $: active = activeNavHref(current, items.map((i) => i.href));

  const reduced = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  // Entra desde el borde final: +x en LTR, −x en RTL. document.dir evita importar LANGUAGES en cliente.
  const flyX = () => (document.documentElement.dir === 'rtl' ? -1 : 1) * 320;

  // Fondo quieto mientras el cajón está abierto. En el WebView de iOS el bloqueo
  // no es total (el cajón lleva overscroll-behavior: contain); no se fuerza más.
  function unlock() { document.documentElement.style.overflow = ''; }
  async function show() {
    open = true;
    document.documentElement.style.overflow = 'hidden';
    // Si una navegación destruye el componente con el cajón abierto, que no quede el scroll bloqueado.
    document.addEventListener('astro:before-swap', unlock, { once: true });
    await tick();
    closeBtn?.focus({ preventScroll: true });
  }
  function hide(returnFocus = true) {
    if (!open) return;
    open = false;
    unlock();
    if (returnFocus) trigger?.focus({ preventScroll: true });
  }
  // Escape cierra. Sin trampa de foco: Tab recorre el cajón en orden y sigue por la página.
  function onKey(e: KeyboardEvent) {
    if (e.key === 'Escape' && open) { e.preventDefault(); hide(); }
  }
  onDestroy(() => { if (typeof document !== 'undefined') unlock(); });
</script>

<svelte:window on:keydown={onKey} />

<button class="trigger" type="button" bind:this={trigger} aria-label={t(locale, 'a11y.menu')} aria-expanded={open} aria-controls="mobile-drawer" on:click={() => (open ? hide() : show())}>
  <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
    {#if open}
      <path d="M6 6l12 12M6 18L18 6" stroke="currentColor" stroke-width="2" fill="none" />
    {:else}
      <path d="M3 6h18M3 12h18M3 18h18" stroke="currentColor" stroke-width="2" fill="none" />
    {/if}
  </svg>
</button>

{#if open}
  <div class="overlay" on:click={() => hide()} role="presentation"></div>
  <nav id="mobile-drawer" class="drawer" aria-label={t(locale, 'a11y.menu')} transition:fly={{ x: flyX(), duration: reduced() ? 0 : 220, opacity: 1 }}>
    <div class="drawer-head">
      <button class="close" type="button" bind:this={closeBtn} aria-label={t(locale, 'common.close')} on:click={() => hide()}>
        <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true"><path d="M6 6l12 12M6 18L18 6" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" /></svg>
      </button>
    </div>
    <ul>
      {#each items as item}
        <li><a href={item.href} aria-current={ariaCurrentFor(current, item.href, active)} on:click={() => hide(false)}>{item.label ?? (item.key ? t(locale, item.key) : item.href)}</a></li>
      {/each}
    </ul>
    <a class="lang" href={langHref} on:click={() => hide(false)}>
      <svg class="globe" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="9" />
        <path d="M3 12h18" />
        <path d="M12 3a14 14 0 0 1 0 18a14 14 0 0 1 0 -18" />
      </svg>
      <span>{t(locale, 'nav.language')} · {langName}</span>
      <svg class="chev icon-direction-aware" viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M9 6l6 6-6 6" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" /></svg>
    </a>
  </nav>
{/if}

<style>
  .trigger {
    display: none;
    /* Sin margin auto: el botón de idioma de Header.astro empuja a los dos al
       final de la fila y la hamburguesa va pegada a él, no en mitad del hueco. */
    padding: var(--s-2);
    color: var(--c-text);
  }
  @media (max-width: 768px) {
    .trigger { display: inline-flex; }
  }
  /* Header.astro la pone cuando ni el globo solo cabe en la cabecera de escritorio. */
  :global(.site-header.cabecera-estrecha) .trigger { display: inline-flex; }
  /* Overlay y cajón empiezan bajo el aviso beta: el aviso vive en el contexto de
     apilamiento raíz (z 60) y el cajón dentro del de la cabecera (z 50), así que
     no puede quedar encima; empezando debajo, el aviso se ve y se descarta con el
     cajón abierto (RootLayout recalcula la variable al descartarlo). */
  .overlay {
    position: fixed;
    inset: var(--beta-banner-h, 0px) 0 0 0;
    background: rgba(0, 0, 0, 0.4);
    z-index: 60;
  }
  .drawer {
    position: fixed;
    inset-block: var(--beta-banner-h, 0px) 0;
    inset-inline-end: 0;
    inline-size: min(80vw, 320px);
    z-index: 70;
    display: grid;
    grid-template-rows: auto auto auto;
    align-content: start;
    padding: 0 var(--s-5) var(--s-6);
    /* Mismo reparto del notch que .site-header: lo consume solo si no hay aviso beta. */
    padding-block-start: max(0px, calc(env(safe-area-inset-top, 0px) - var(--beta-banner-h, 0px)));
    background: var(--c-bg);
    /* Sombra simétrica: vale con el cajón a la derecha (LTR) y a la izquierda (RTL). */
    box-shadow: 0 0 24px rgba(0, 0, 0, 0.1);
    overflow-y: auto;
    overscroll-behavior: contain;
  }
  .drawer-head {
    display: flex;
    justify-content: flex-end;
    align-items: center;
    block-size: 64px;
    margin-inline-end: calc(-1 * var(--s-2));
  }
  .close {
    inline-size: 44px;
    block-size: 44px;
    display: grid;
    place-items: center;
    border-radius: var(--r-md);
    color: var(--c-text);
  }
  .close:hover { background: var(--c-bg-alt); color: var(--c-red); }
  .close:focus-visible,
  .drawer a:focus-visible { outline: 2px solid var(--c-red); outline-offset: 2px; }
  .drawer ul { list-style: none; margin: 0; padding: 0; display: grid; gap: var(--s-2); }
  .drawer a {
    display: block;
    padding: var(--s-3);
    border-radius: var(--r-md);
    text-decoration: none;
    color: var(--c-text);
    font-weight: 500;
    border-inline-start: 3px solid transparent;
  }
  .drawer a:hover { background: var(--c-bg-alt); color: var(--c-red); }
  /* Sección actual: el mismo aspecto que la lección activa de UnitSidebar. */
  .drawer a[aria-current] { background: var(--c-red-soft); color: var(--c-red); border-inline-start-color: var(--c-red); }
  /* Fila de idioma: hereda de `.drawer a` el sangrado de las filas (globo alineado
     con el texto de los enlaces); `.drawer .lang` para ganarle en especificidad. */
  .drawer .lang {
    display: flex;
    align-items: center;
    gap: var(--s-2);
    margin-block-start: var(--s-4);
    padding-block: var(--s-4);
    border-block-start: 1px solid var(--c-border);
    border-radius: 0;
    font-weight: 600;
  }
  .lang .globe { color: var(--c-red); flex-shrink: 0; }
  .lang .chev { margin-inline-start: auto; color: var(--c-text-muted); flex-shrink: 0; }
</style>
