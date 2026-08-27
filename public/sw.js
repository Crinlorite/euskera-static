// Service Worker para euskera-static.
// Strategy:
//   - HTML / navegaciones: network-first (siempre fresco si hay internet,
//     fallback a caché si offline). Esto evita el bug de cache-first sobre
//     HTML hashed que rota referencias a bundles obsoletos.
//   - Assets estáticos (_astro/*, fonts, imágenes): cache-first. Son
//     immutable (Astro hashes), así que cachearlos agresivo es seguro.
//   - Cualquier otro GET: network-first como fallback razonable.
//
// PLAZO DE RED (2026-08-27): el network-first NO puede esperar indefinidamente.
// Si hay copia guardada y la red no contesta en NETWORK_TIMEOUT_MS, se sirve la
// copia y la petición sigue en segundo plano para refrescarla. Sin ese plazo,
// una conexión a medias (portal cautivo, cambio de red, DNS mudo) deja la app
// colgada para siempre — en el envoltorio Android eso se ve como quedarse
// clavado en la pantalla de inicio. Reportado por un tester el 27-ago-2026.
// ⚠️ El plazo solo aplica cuando HAY copia: sin ella hay que esperar a la red,
// porque rendirse rompería la primera carga en conexiones lentas.
//
// CACHE_VERSION: bump manual antes de releases que cambien la shell o
// inviten a invalidar lo cacheado. CF Pages garantiza que los hashes en
// los assets cambian solos, así que en la mayoría de releases NO hay que
// tocar esto.

const CACHE_VERSION = 'euskera-v5';
const NETWORK_TIMEOUT_MS = 4000;
const SE_AGOTO = Symbol('plazo de red agotado');

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
  '/favicon-512-maskable.png',
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
  const cached = await caches.match(req);

  // La petición SIEMPRE se lanza y refresca la caché si trae algo bueno,
  // aunque llegue tarde y ya hayamos servido la copia guardada.
  const red = fetch(req).then(async (fresh) => {
    if (fresh && fresh.status === 200) {
      const cache = await caches.open(cacheName);
      await cache.put(req, fresh.clone());
    }
    return fresh;
  });

  if (!cached) {
    // Sin copia no hay nada mejor que esperar, por lenta que sea la red.
    try {
      return await red;
    } catch (err) {
      // Navegación a una página nunca visitada y sin red: la home guardada
      // es mejor recibimiento que el error del navegador.
      if (req.destination === 'document' || req.mode === 'navigate') {
        const home = await caches.match('/es/');
        if (home) return home;
        const root = await caches.match('/');
        if (root) return root;
      }
      throw err;
    }
  }

  // Con copia guardada, la red corre contra el reloj.
  red.catch(() => {});  // un fallo tardío ya está contemplado: que no quede suelto
  let reloj;
  const plazo = new Promise((resolver) => {
    reloj = setTimeout(() => resolver(SE_AGOTO), NETWORK_TIMEOUT_MS);
  });
  try {
    const ganador = await Promise.race([red, plazo]);
    return ganador === SE_AGOTO ? cached : ganador;
  } catch {
    return cached;
  } finally {
    clearTimeout(reloj);
  }
}
