<script lang="ts">
  import type { LocaleCode } from '../../i18n/config';
  import { t } from '../../i18n/ui';
  export let locale: LocaleCode;

  let open = false;

  const items: Array<{ href: string; label?: string; key?: 'nav.home' | 'nav.about' | 'nav.language' | 'nav.progress' }> = [
    { href: `/${locale}/`, key: 'nav.home' },
    { href: `/${locale}/a1/`, label: 'A1' },
    { href: `/${locale}/sobre/`, key: 'nav.about' },
    { href: `/${locale}/idioma/`, key: 'nav.language' },
    { href: `/${locale}/progreso/`, key: 'nav.progress' },
  ];
</script>

<button class="trigger" aria-label="Menú" aria-expanded={open} on:click={() => (open = !open)}>
  <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
    {#if open}
      <path d="M6 6l12 12M6 18L18 6" stroke="currentColor" stroke-width="2" fill="none" />
    {:else}
      <path d="M3 6h18M3 12h18M3 18h18" stroke="currentColor" stroke-width="2" fill="none" />
    {/if}
  </svg>
</button>

{#if open}
  <div class="overlay" on:click={() => (open = false)} role="presentation"></div>
  <aside class="drawer" aria-label="Menú móvil">
    <ul>
      {#each items as item}
        <li><a href={item.href} on:click={() => (open = false)}>
          {item.label ?? (item.key ? t(locale, item.key) : item.href)}
        </a></li>
      {/each}
    </ul>
  </aside>
{/if}

<style>
  .trigger {
    display: none;
    margin-inline-start: auto;
    padding: var(--s-2);
    color: var(--c-text);
  }
  @media (max-width: 768px) {
    .trigger { display: inline-flex; }
  }
  .overlay {
    position: fixed; inset: 0;
    background: rgba(0, 0, 0, 0.4);
    z-index: 60;
  }
  .drawer {
    position: fixed;
    inset-block: 0;
    inset-inline-end: 0;
    inline-size: min(80vw, 320px);
    background: var(--c-bg);
    z-index: 70;
    padding: var(--s-6);
    box-shadow: -4px 0 24px rgba(0, 0, 0, 0.1);
  }
  .drawer ul { list-style: none; margin: 0; padding: 0; display: grid; gap: var(--s-3); }
  .drawer a {
    display: block;
    padding: var(--s-3);
    border-radius: var(--r-md);
    text-decoration: none;
    color: var(--c-text);
    font-weight: 500;
  }
  .drawer a:hover { background: var(--c-bg-alt); color: var(--c-red); }
</style>
