<script lang="ts">
  import { LANGUAGES, type LocaleCode } from '../../i18n/config';
  import { t } from '../../i18n/ui';

  export let currentLocale: LocaleCode;

  const all = Object.values(LANGUAGES);

  function pick(code: LocaleCode, status: string) {
    if (status === 'planned') return;
    if (typeof document !== 'undefined') {
      document.cookie = `lang=${code}; path=/; max-age=31536000`;
    }
    if (typeof location !== 'undefined') {
      const path = location.pathname.replace(/^\/[a-zA-Z-]+/, `/${code}`);
      location.href = path;
    }
  }
</script>

<ul class="picker">
  {#each all as lang}
    <li class:active={lang.code === currentLocale} class:disabled={lang.status === 'planned'}>
      <button on:click={() => pick(lang.code, lang.status)} disabled={lang.status === 'planned'}>
        <span class="name" dir={lang.dir}>{lang.name}</span>
        {#if lang.status === 'beta'}<span class="badge beta">{t(currentLocale, 'lang.beta')}</span>{/if}
        {#if lang.status === 'planned'}<span class="badge planned">{t(currentLocale, 'lang.upcoming')}</span>{/if}
      </button>
    </li>
  {/each}
</ul>

<style>
  .picker { list-style: none; margin: 0; padding: 0; display: grid; gap: var(--s-2); }
  button {
    inline-size: 100%;
    text-align: start;
    display: flex;
    align-items: center;
    gap: var(--s-3);
    padding: var(--s-3) var(--s-4);
    border: 1px solid var(--c-border);
    border-radius: var(--r-md);
    background: var(--c-bg);
    transition: background 150ms, border-color 150ms;
  }
  button:hover:not([disabled]) {
    background: var(--c-red-soft);
    border-color: var(--c-red);
  }
  .active button { border-color: var(--c-red); background: var(--c-red-soft); }
  .disabled button {
    color: var(--c-text-dim);
    cursor: not-allowed;
    opacity: 0.7;
  }
  .name { font-weight: 500; }
  .badge {
    margin-inline-start: auto;
    font-size: 0.75rem;
    padding: 2px 8px;
    border-radius: 999px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
  .beta { background: var(--c-green-soft); color: var(--c-green-strong); }
  .planned { background: var(--c-bg-muted); color: var(--c-text-muted); }
</style>
