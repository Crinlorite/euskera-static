import { normalize } from '../components/exercises/types.ts';

/**
 * Corrección de los ejercicios de rellenar hueco.
 *
 * Un "hueco" es una racha de 3+ guiones bajos; rachas consecutivas separadas
 * solo por espacios forman UN único hueco multi-palabra ("___ ___").
 */
const GAP_RE = /_{3,}(?:[ \t]+_{3,})*/;

export interface GapParts { before: string; after: string; gap: string }

export function splitGap(prompt: string): GapParts {
  const m = GAP_RE.exec(prompt);
  if (!m) return { before: prompt, after: '', gap: '' };
  return { before: prompt.slice(0, m.index), after: prompt.slice(m.index + m[0].length), gap: m[0] };
}

const clean = (s: string) => normalize(s).replace(/\s+/g, ' ');
// Como `normalize()` pero sin recortar: el espacio junto al hueco decide si va pegado.
const fold = (s: string) => s.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');

/**
 * ¿Es correcta la respuesta? Además de las respuestas tal cual, cuando el hueco
 * va pegado a una palabra ("Donostia___", el sufijo) se acepta la palabra
 * entera ("Donostian") y, si va pegado por delante, el sufijo con guion ("-n"):
 * en pantalla la raíz y la caja se ven separadas y es natural escribir así
 * (ticket EU-0005). Nada de esto acepta una respuesta sin el sufijo correcto.
 */
export function isFillCorrect(value: string, answers: string[], before = '', after = ''): boolean {
  const v = clean(value);
  if (!v) return false;
  const stem = /\p{L}+$/u.exec(fold(before))?.[0] ?? '';
  const tail = /^\p{L}+/u.exec(fold(after))?.[0] ?? '';
  return answers.some((a) => {
    const n = clean(a);
    if (!n) return false;
    if (v === n) return true;
    if ((stem || tail) && v === stem + n + tail) return true;
    return Boolean(stem) && v === `-${n}`;
  });
}
