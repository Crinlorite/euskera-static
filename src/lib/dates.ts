/**
 * Fechas de calendario del progreso: días 'YYYY-MM-DD' en la hora LOCAL del
 * dispositivo. Puro (sin storage ni DOM) para poder probarlo con `node --test`.
 *
 * El día de estudio acaba a medianoche local, no a medianoche UTC: quien estudia
 * a las 00:30 en Madrid lo hace "hoy", no "ayer". Todo lo que necesite saber qué
 * día es (racha, actividad, repaso) pasa por `todayKey()`.
 */

const pad = (n: number): string => String(n).padStart(2, '0');

/** Día local 'YYYY-MM-DD'. ÚNICA definición de "hoy" en todo el sitio. */
export function todayKey(d: Date = new Date()): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** 'YYYY-MM-DD' local → Date a medianoche local. */
export function keyToDate(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** Suma (o resta) días de calendario; cruza meses, años y cambios de hora. */
export function addDays(key: string, n: number): string {
  const d = keyToDate(key);
  d.setDate(d.getDate() + n);
  return todayKey(d);
}

/**
 * Días enteros de `from` a `to` (negativo si `to` es anterior). Redondea para que
 * un día de 23 o 25 horas (cambio de hora) cuente como uno. Fechas inválidas → 0.
 */
export function daysBetween(from: string, to: string): number {
  const diff = Math.round((keyToDate(to).getTime() - keyToDate(from).getTime()) / 86400000);
  return Number.isFinite(diff) ? diff : 0;
}

/** Lunes de la semana del día dado (semana lunes–domingo). */
export function weekStart(key: string): string {
  const dow = (keyToDate(key).getDay() + 6) % 7;
  return addDays(key, -dow);
}
