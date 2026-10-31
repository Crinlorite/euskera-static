/**
 * Palabras y expresiones practicadas (fase 3): el euskera distinto de las
 * tarjetas y de los ejercicios de emparejar. Puro.
 *
 * En la página de progreso cada palabra distinta del idioma recibe un número
 * entero al construir el índice (`indexLessons(…, { vocab: true })`, campo `v`):
 * así el recuento es exacto, cabe en poco y no se guarda nada en el progreso.
 */

// Los ejercicios reales traen más campos (id, es, prompt…): se aceptan y se ignoran.
interface VocabExercise {
  type: string;
  cards?: Array<{ eu: string; [k: string]: unknown }>;
  pairs?: Array<{ eu: string; [k: string]: unknown }>;
  [k: string]: unknown;
}

/** Misma regla que `normalize()` de los ejercicios, quitando además los signos de los extremos. */
function normalizeWord(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/^[\s\p{P}]+|[\s\p{P}]+$/gu, '')
    .trim();
}

/** Euskera distinto (normalizado) de tarjetas y emparejar, en orden de aparición. */
export function vocabWords(exercises: VocabExercise[]): string[] {
  const out = new Set<string>();
  for (const e of exercises ?? []) {
    const list = e.type === 'flashcards' ? e.cards : e.type === 'match-pairs' ? e.pairs : undefined;
    for (const item of list ?? []) {
      const w = normalizeWord(item?.eu ?? '');
      if (w) out.add(w);
    }
  }
  return [...out];
}

/** Palabras distintas de las lecciones dadas, según los `v` del índice. */
export function countVocab(index: Record<string, { v?: number[] }>, lessonIds: Iterable<string>): number {
  const seen = new Set<number>();
  for (const id of lessonIds) for (const n of index[id]?.v ?? []) seen.add(n);
  return seen.size;
}
