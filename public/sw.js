// Service Worker para euskera-static.
// Strategy:
//   - HTML / navegaciones: network-first (siempre fresco si hay internet,
//     fallback a caché si offline). Esto evita el bug de cache-first sobre
//     HTML hashed que rota referencias a bundles obsoletos.
//   - Assets estáticos (_astro/*, fonts, imágenes): cache-first. Son
//     immutable (Astro hashes), así que cachearlos agresivo es seguro.
//   - Cualquier otro GET: network-first como fallback razonable.
//
// CACHE_VERSION: bump manual antes de releases que cambien la shell o
// inviten a invalidar lo cacheado. CF Pages garantiza que los hashes en
// los assets cambian solos, así que en la mayoría de releases NO hay que
// tocar esto.

const CACHE_VERSION = 'euskera-v1';
const STATIC_CACHE = `static-${CACHE_VERSION}`;
const PAGES_CACHE = `pages-${CACHE_VERSION}`;
const ASSETS_CACHE = `assets-${CACHE_VERSION}`;

// Shell mínimo: lo que la app necesita para arrancar offline.
// El resto se cachea on-demand al visitarse.
const PRECACHE = [
  '/',
  '/es/',
  '/manifest.json',
  '/favicon.svg',
  '/favicon-32.png',
  '/favicon-192.png',
  '/favicon-512.png',
  '/apple-touch-icon.png',
  '/og-image.png',
  '/fonts/Manrope-Variable.woff2',
  '/fonts/Fraunces-Variable.woff2',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) =>
      // Cada add individual con catch — si un asset falla (ej. URL movida)
      // no rompe toda la instalación.
      Promise.all(PRECACHE.map((url) =>
        cache.add(new Request(url, { cache: 'reload' })).catch(() => {})
      ))
    )
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((names) =>
        Promise.all(
          names
            .filter((n) => !n.endsWith(CACHE_VERSION))
            .map((n) => caches.delete(n))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  // Solo same-origin — no cacheamos third-party (CF analytics, etc.)
  if (url.origin !== self.location.origin) return;

  // Astro-built assets son immutable por hash → cache-first
  const isImmutableAsset =
    url.pathname.startsWith('/_astro/') ||
    url.pathname.startsWith('/fonts/') ||
    /\.(?:woff2?|ttf|otf|png|jpe?g|webp|avif|svg|gif|ico)$/i.test(url.pathname);

  if (isImmutableAsset) {
    event.respondWith(cacheFirst(req, ASSETS_CACHE));
    return;
  }

  // HTML / navegaciones / cualquier otra cosa → network-first
  event.respondWith(networkFirst(req, PAGES_CACHE));
});

async function cacheFirst(req, cacheName) {
  const cached = await caches.match(req);
  if (cached) return cached;
  try {
    const fresh = await fetch(req);
    if (fresh && fresh.status === 200) {
      const cache = await caches.open(cacheName);
      cache.put(req, fresh.clone());
    }
    return fresh;
  } catch (err) {
    // Si no hay cache y no hay red, propagamos el error.
    throw err;
  }
}

async function networkFirst(req, cacheName) {
  try {
    const fresh = await fetch(req);
    if (fresh && fresh.status === 200) {
      const cache = await caches.open(cacheName);
      cache.put(req, fresh.clone());
    }
    return fresh;
  } catch (err) {
    const cached = await caches.match(req);
    if (cached) return cached;
    // Para navegaciones a páginas no cacheadas, sirve la home como fallback
    // amigable en offline.
    if (req.destination === 'document' || req.mode === 'navigate') {
      const home = await caches.match('/es/');
      if (home) return home;
      const root = await caches.match('/');
      if (root) return root;
    }
    throw err;
  }
}
