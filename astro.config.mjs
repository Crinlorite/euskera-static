import { defineConfig } from 'astro/config';
import svelte from '@astrojs/svelte';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://euskera.crintech.pro',
  trailingSlash: 'always',
  i18n: {
    defaultLocale: 'es',
    locales: ['es'],
    routing: {
      prefixDefaultLocale: true,
      // redirectToDefaultLocale:false — dejamos que src/pages/index.astro sirva
      // la landing con selector de idiomas + countdown en lugar del redirect auto.
      redirectToDefaultLocale: false,
    },
  },
  integrations: [svelte(), sitemap()],
  build: {
    format: 'directory',
  },
});
