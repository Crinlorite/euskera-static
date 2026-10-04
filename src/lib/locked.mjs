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

/**
 * Paginas de servicio: existen para que la app haga algo (p. ej. traer el
 * progreso de la TWA al contenedor nuevo de Android), no para leerse. No estan
 * bajo candado, pero tampoco se ofrecen a Google ni salen en el sitemap.
 */
export const SERVICE_PATHS = ['app'];

/** ¿Es una pagina de servicio? Nunca llevan prefijo de idioma. */
export function esDeServicio(pathname) {
  return SERVICE_PATHS.includes(pathname.replace(/^\/+/, '').split('/')[0]);
}

/** Lo que no debe indexarse ni anunciarse, por un motivo o por otro. */
export function fueraDeBuscadores(pathname) {
  return estaBloqueada(pathname) || esDeServicio(pathname);
}
