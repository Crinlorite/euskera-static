import { GRADED_TYPES } from './lesson-state.ts';

// Índice mínimo de lecciones para derivar estados en cliente sin cargar el
// contenido. Se construye en el frontmatter (servidor) y viaja embebido en la
// página, una sola vez, como JSON (componente LessonIndexData): como props de
// una isla ocuparía más del doble (etiquetas de tipo y entidades HTML) y en la
// ventana de progreso iría repetido. Por eso, también, las claves son cortas.
export interface LessonIndexEntry {
  /** id de la unidad. */
  u: string;
  /** ids de TODOS los ejercicios actuales, en orden. */
  ex: string[];
  /** ids de los corregibles (subconjunto de `ex`). */
  g: string[];
  /** Título (solo si se pide). */
  t?: string;
  /** Código de la lección, el último tramo de su URL (solo si se pide). */
  c?: string;
  /** Enlace (solo si se pide). */
  h?: string;
}

/** id de lección → datos mínimos para `lessonState()`. */
export type LessonIndex = Record<string, LessonIndexEntry>;

export interface IndexableLesson {
  data: { id: string; unitId: string; title: string; code: string; exercises: Array<{ id: string; type: string }> };
}

/** JSON del índice apto para ir dentro de `<script type="application/json">`. */
export function serializeIndex(index: LessonIndex): string {
  return JSON.stringify(index).replace(/</g, '\\u003c');
}

/** Atributo del `<script type="application/json">` que lleva el índice en la página. */
export const INDEX_ATTR = 'data-lesson-index';

/**
 * Lee (en cliente) el índice embebido en la página, o el de dentro de `root`.
 * Vacío si no lo hay o no se puede leer.
 */
export function readIndex(root: ParentNode = document): LessonIndex {
  try {
    const raw = root.querySelector(`script[${INDEX_ATTR}]`)?.textContent;
    return raw ? (JSON.parse(raw) as LessonIndex) : {};
  } catch {
    return {};
  }
}

/**
 * Índice de las lecciones dadas. El ORDEN de inserción de las claves es el de
 * entrada (las claves no numéricas de un objeto lo conservan, también tras
 * JSON): quien lo construye en orden de currículo puede usar `Object.keys()`
 * como ese orden (lo hacen nextLesson() y los anillos del índice de nivel).
 */
export function indexLessons<L extends IndexableLesson>(
  lessons: L[],
  opts: { titles?: boolean; codes?: boolean; hrefOf?: (l: L) => string } = {},
): LessonIndex {
  const out: LessonIndex = {};
  for (const l of lessons) {
    const exercises = l.data.exercises ?? [];
    const entry: LessonIndexEntry = {
      u: l.data.unitId,
      ex: exercises.map((e) => e.id),
      g: exercises.filter((e) => GRADED_TYPES.has(e.type)).map((e) => e.id),
    };
    if (opts.titles) entry.t = l.data.title;
    if (opts.codes) entry.c = l.data.code;
    if (opts.hrefOf) entry.h = opts.hrefOf(l);
    out[l.data.id] = entry;
  }
  return out;
}
