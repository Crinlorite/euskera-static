import { t, tf, type StringKey } from '../i18n/ui.ts';
import type { LocaleCode } from '../i18n/config.ts';
import { ACHIEVEMENT_BY_ID } from './achievements.ts';

/**
 * Título, descripción e icono de un logro en el idioma de la página. Los logros
 * por unidad, nivel o cifra comparten una clave con parámetro (`ach.mastery.*`,
 * `ach.perfect.*`, `ach.level.*`, `ach.review.*`); el resto tiene la suya
 * (`ach.<id>.t/.d`). Sin clave cae al texto del catálogo y, si tampoco, al id.
 */

type Part = 't' | 'd';

const FAMILIES: Array<{ re: RegExp; key: string; arg: (m: RegExpMatchArray, titles: Record<string, string>) => string }> = [
  { re: /^unit-complete-(.+)$/, key: 'ach.mastery', arg: (m, ti) => ti[m[1]] ?? '' },
  { re: /^perfect-unit-(.+)$/, key: 'ach.perfect', arg: (m, ti) => ti[m[1]] ?? '' },
  { re: /^level-complete-(.+)$/, key: 'ach.level', arg: (m) => m[1].toUpperCase() },
  { re: /^review-(\d+)$/, key: 'ach.review', arg: (m) => m[1] },
];

// Caída sin traducción para unidades que no están en el catálogo de A1.
const FALLBACK: Record<string, (rest: string) => Record<Part, string>> = {
  'ach.mastery': (u) => ({ t: `Maestría: ${u}`, d: `Completa todas las lecciones de la unidad "${u}".` }),
  'ach.perfect': (u) => ({ t: `Impecable: ${u}`, d: `Todas las lecciones de la unidad «${u}» en verde.` }),
};

function text(loc: string, id: string, titles: Record<string, string>, part: Part): string {
  const l = loc as LocaleCode;
  for (const f of FAMILIES) {
    const m = id.match(f.re);
    if (!m) continue;
    const arg = f.arg(m, titles);
    if (arg) return tf(l, `${f.key}.${part}` as StringKey, arg);
    const cat = ACHIEVEMENT_BY_ID[id];
    if (cat) return part === 't' ? cat.title : cat.description;
    return FALLBACK[f.key]?.(m[1])[part] ?? id;
  }
  const key = `ach.${id}.${part}` as StringKey;
  const v = t(l, key);
  if (v !== key) return v;
  const cat = ACHIEVEMENT_BY_ID[id];
  return cat ? (part === 't' ? cat.title : cat.description) : id;
}

export const achievementTitle = (loc: string, id: string, unitTitles: Record<string, string> = {}): string =>
  text(loc, id, unitTitles, 't');

export const achievementDesc = (loc: string, id: string, unitTitles: Record<string, string> = {}): string =>
  text(loc, id, unitTitles, 'd');

export function achievementIcon(id: string): string {
  if (id.startsWith('unit-complete-')) return '📘';
  if (id.startsWith('perfect-unit-')) return '🟢';
  if (id.startsWith('level-complete-')) return '🏆';
  return ACHIEVEMENT_BY_ID[id]?.icon ?? '🏅';
}
