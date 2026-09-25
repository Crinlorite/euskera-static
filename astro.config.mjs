import { defineConfig } from 'astro/config';
import svelte from '@astrojs/svelte';
import sitemap from '@astrojs/sitemap';
import { estaBloqueada } from './src/lib/locked.mjs';

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
  integrations: [
    svelte(),
    // Los niveles bajo candado (B1-C2 y EGA) no se ofrecen
    // a Google: son contenido sin validar y quien llegue desde una busqueda se
    // encuentra una pantalla de contrasena. Las paginas se siguen generando;
    // solo dejan de anunciarse, y ademas llevan noindex (ver RootLayout).
    sitemap({ filter: (url) => !estaBloqueada(new URL(url).pathname) }),
  ],
  build: {
    format: 'directory',
  },
  vite: {
    define: {
      // Sello de build visible en el menú del juego: permite distinguir al
      // instante "código nuevo desplegado" de "caché/SW viejo en el cliente".
      __BUILD_ID__: JSON.stringify(
        new Date().toISOString().slice(0, 16).replace('T', ' ') + ' UTC',
      ),
    },
  },
});
