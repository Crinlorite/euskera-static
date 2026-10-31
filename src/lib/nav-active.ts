// Qué enlace del menú corresponde a la página actual. La usan la cabecera de
// escritorio y el cajón móvil: una sola regla para los dos.

/**
 * Enlace del menú que corresponde a la ruta actual: la portada del idioma
 * ('/es/') solo por igualdad exacta; el resto por prefijo (el más largo gana).
 * `null` si ninguno (p. ej. /es/sobre/, /es/idioma/, /es/b1/…).
 */
export function activeNavHref(here: string, hrefs: readonly string[]): string | null {
  let best: string | null = null;
  for (const h of hrefs) {
    const portada = /^\/[^/]+\/$/.test(h);
    if (portada ? here === h : here.startsWith(h)) {
      if (!best || h.length > best.length) best = h;
    }
  }
  return best;
}

/** Valor de aria-current para un enlace: 'page' en la página exacta, 'true' en su sección, nada si no es el activo. */
export function ariaCurrentFor(here: string, href: string, active: string | null): 'page' | 'true' | undefined {
  if (href !== active) return undefined;
  return here === href ? 'page' : 'true';
}
