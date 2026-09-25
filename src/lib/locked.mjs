/**
 * Rutas que viven detras del candado de revision. A1 y A2 nunca lo estan.
 *
 * Vive en un .mjs suelto porque lo necesitan tres sitios que no pueden
 * importarse entre si: el gate del navegador (gate.ts), la portada, y la
 * configuracion del sitemap (astro.config.mjs, que corre en Node y no puede
 * cargar un .ts con import.meta.env).
 *
 * 'ega' sigue aqui aunque el nivel ya no exista en la escalera (paso a c1/c2):
 * las unidades es/ega/* huerfanas aun generan paginas y sin esto quedarian
 * abiertas.
 */
export const LOCKED_PATHS = ['b1', 'b2', 'c1', 'c2', 'ega'];

/** ¿Esta ruta (con o sin prefijo de idioma) cae detras del candado? */
export function estaBloqueada(pathname) {
  const seg = pathname.replace(/^\/+/, '').split('/');
  return LOCKED_PATHS.includes(seg[0]) || LOCKED_PATHS.includes(seg[1]);
}
