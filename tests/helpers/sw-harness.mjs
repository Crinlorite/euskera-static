// Banco de pruebas del service worker: carga public/sw.js de verdad con
// caches/fetch/Request simulados y devuelve sus manejadores para poder
// invocarlos como lo haría el navegador.
import { readFileSync } from 'node:fs';

export function cargarSW({ red, cacheInicial = {} } = {}) {
  const almacenes = new Map();          // nombre → Map(url → respuesta)
  const puestos = [];                   // registro de lo que se guarda

  const respuesta = (cuerpo, status = 200) => ({
    status, cuerpo, clone() { return respuesta(cuerpo, status); },
  });

  for (const [nombre, entradas] of Object.entries(cacheInicial)) {
    const m = new Map();
    for (const [url, cuerpo] of Object.entries(entradas)) m.set(url, respuesta(cuerpo));
    almacenes.set(nombre, m);
  }

  const abrir = (nombre) => {
    if (!almacenes.has(nombre)) almacenes.set(nombre, new Map());
    const m = almacenes.get(nombre);
    return Promise.resolve({
      put: (req, res) => {
        const url = typeof req === 'string' ? req : req.url;
        m.set(url, res); puestos.push(url); return Promise.resolve();
      },
      add: () => Promise.resolve(),
    });
  };

  const ORIGEN = 'https://euskera.crintech.pro';
  const caches = {
    open: abrir,
    match: (req) => {
      // El navegador resuelve rutas relativas contra el ámbito del SW.
      const crudo = typeof req === 'string' ? req : req.url;
      const url = new URL(crudo, ORIGEN).href;
      for (const m of almacenes.values()) if (m.has(url)) return Promise.resolve(m.get(url));
      return Promise.resolve(undefined);
    },
    keys: () => Promise.resolve([...almacenes.keys()]),
    delete: (n) => { almacenes.delete(n); return Promise.resolve(true); },
  };

  const manejadores = {};
  const self = {
    addEventListener: (tipo, fn) => { manejadores[tipo] = fn; },
    skipWaiting: () => {},
    clients: { claim: () => Promise.resolve() },
    location: { origin: 'https://euskera.crintech.pro' },
  };

  const src = readFileSync(new URL('../../public/sw.js', import.meta.url), 'utf8');
  const fn = new Function('self', 'caches', 'fetch', 'Request', 'URL', 'console', src);
  fn(self, caches, red, class Peticion { constructor(u) { this.url = u; } }, URL, console);

  const pedir = (url, extra = {}) => {
    const req = { url, method: 'GET', destination: 'document', mode: 'navigate', ...extra };
    let servido;
    manejadores.fetch({ request: req, respondWith: (p) => { servido = p; } });
    return servido;
  };

  return { pedir, puestos, respuesta, almacenes, manejadores };
}
