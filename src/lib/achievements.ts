import type { ProgressV1 } from '../stores/progress';
import type { LessonIndex } from './lesson-index.ts';
import { lessonState } from './lesson-state.ts';
import { derivedDays, hasComeback } from './activity.ts';
import { LOCKED_PATHS } from './locked.mjs';

// Catálogo de logros + evaluador puro.
//
// Diseño:
// - El catálogo es una constante exportada, sin estado.
// - `evaluate()` es 100% pura: dado el mismo progreso, devuelve siempre la
//   misma lista de IDs de logros desbloqueados.
// - El store de progreso no llama aquí: la decisión de "desbloquear ahora"
//   se hace desde el componente que muestra los logros (o desde la página
//   de progreso) llamando a `evaluate()` y luego a `unlockAchievements()`.
// - Las fechas de desbloqueo (`unlockedAt`) viven en `progress.achievements`
//   y se rellenan la primera vez que un id pasa por `unlockAchievements()`.

export type AchievementCategory = 'milestone' | 'mastery' | 'streak' | 'volume';

export interface Achievement {
  /** ID estable y opaco. Nunca se renombra (se usa como clave en el progreso). */
  id: string;
  /** Título mostrado al usuario (Castellano). */
  title: string;
  /** Una o dos líneas explicando cómo se consigue. */
  description: string;
  /** Emoji de un solo carácter visual. */
  icon: string;
  /** Categoría para filtros y agrupación visual. */
  category: AchievementCategory;
}

// IDs de unidades del A1 con sus títulos cortos para los logros de mastery.
// Mantenidos aquí para que `evaluate()` no tenga que importar nada del
// content collection (que no es accesible desde el cliente).
const A1_UNITS: Array<{ unitId: string; shortTitle: string }> = [
  { unitId: 'a1-greetings',    shortTitle: 'Saludos' },
  { unitId: 'a1-family',       shortTitle: 'Familia' },
  { unitId: 'a1-descriptions', shortTitle: 'Descripciones' },
  { unitId: 'a1-bar-food',     shortTitle: 'Bar y comida' },
  { unitId: 'a1-town',         shortTitle: 'Mi pueblo' },
  { unitId: 'a1-directions',   shortTitle: 'Direcciones' },
  { unitId: 'a1-routine',      shortTitle: 'Rutina diaria' },
  { unitId: 'a1-recent-past',  shortTitle: 'Pasado reciente' },
  { unitId: 'a1-home',         shortTitle: 'Mi casa' },
  { unitId: 'a1-people',       shortTitle: 'Mi gente' },
  { unitId: 'a1-shopping',     shortTitle: 'Comprar' },
  { unitId: 'a1-restaurant',   shortTitle: 'Restaurante' },
  { unitId: 'a1-week-plan',    shortTitle: 'Agenda semanal' },
];

const A1_SHORT: Record<string, string> = Object.fromEntries(A1_UNITS.map((u) => [u.unitId, u.shortTitle]));

// ---------- Piezas del catálogo (los textos de aquí son la caída en castellano;
// lo que se ve sale de las claves `ach.*` de cada idioma) ----------

const MILESTONES_BEFORE: Achievement[] = [
  {
    id: 'first-step',
    title: 'Primer paso',
    description: 'Abre tu primera lección de euskera. Aupa!',
    icon: '👣',
    category: 'milestone',
  },
  {
    id: 'first-completed',
    title: 'Primera lección completada',
    description: 'Termina una lección entera por primera vez.',
    icon: '✅',
    category: 'milestone',
  },
  {
    id: 'first-perfect',
    title: 'Primera lección en verde',
    description: 'Acierta todos los ejercicios de una lección, repitiendo si hace falta.',
    icon: '💚',
    category: 'milestone',
  },
  {
    id: 'first-unit',
    title: 'Primera unidad',
    description: 'Completa todas las lecciones de tu primera unidad.',
    icon: '🎯',
    category: 'milestone',
  },
];

/**
 * «Nivel superado» repetía «A1 completo» (se conceden a la vez). Ya no se
 * concede ni se ofrece, pero quien lo tiene lo sigue viendo y contando: que su
 * «N de M» no baje nunca.
 */
const FIRST_LEVEL: Achievement = {
  id: 'first-level',
  title: 'Nivel superado',
  description: 'Completa todas las lecciones del nivel A1.',
  icon: '🏔️',
  category: 'milestone',
};
export const LEGACY_ACHIEVEMENTS: Achievement[] = [FIRST_LEVEL];

const MILESTONES_AFTER: Achievement[] = [
  {
    id: 'first-export',
    title: 'Memory card en mano',
    description: 'Exporta tu progreso por primera vez.',
    icon: '💾',
    category: 'milestone',
  },
  {
    id: 'first-import',
    title: 'Reanudación',
    description: 'Restaura tu progreso desde una memory card.',
    icon: '📥',
    category: 'milestone',
  },
];

const STREAKS: Achievement[] = [
  {
    id: 'streak-3',
    title: 'Constancia: 3 días',
    description: 'Estudia 3 días seguidos.',
    icon: '🔥',
    category: 'streak',
  },
  {
    id: 'streak-7',
    title: 'Constancia: 7 días',
    description: 'Una semana entera estudiando sin saltarte un día.',
    icon: '🔥',
    category: 'streak',
  },
  {
    id: 'streak-14',
    title: 'Constancia: 14 días',
    description: 'Dos semanas seguidas con el euskera.',
    icon: '🔥',
    category: 'streak',
  },
  {
    id: 'streak-30',
    title: 'Constancia: 30 días',
    description: 'Un mes entero. Eso ya es hábito.',
    icon: '🌋',
    category: 'streak',
  },
  {
    id: 'comeback',
    title: 'Has vuelto',
    description: 'Volviste tras una semana o más sin estudiar. Eso también es constancia.',
    icon: '👋',
    category: 'streak',
  },
];

const VOLUME: Achievement[] = [
  {
    id: 'volume-10',
    title: '10 lecciones',
    description: 'Completa 10 lecciones (de cualquier unidad).',
    icon: '📚',
    category: 'volume',
  },
  {
    id: 'volume-25',
    title: '25 lecciones',
    description: 'Completa 25 lecciones. Ya estás en marcha.',
    icon: '📚',
    category: 'volume',
  },
  {
    id: 'volume-50',
    title: '50 lecciones',
    description: 'Completa 50 lecciones. Vaya ritmo.',
    icon: '📚',
    category: 'volume',
  },
];

const VOLUME_A1: Achievement = {
  id: 'volume-a1-complete',
  title: 'A1 completo',
  description: 'Completa todas las lecciones del nivel A1.',
  icon: '🏆',
  category: 'volume',
};

/** Ejercicios fallados y acertados después (cuenta `fails > 0 ∧ bestScore === 100`). */
export const REVIEW_STEPS = [10, 50] as const;
const REVIEW: Achievement[] = REVIEW_STEPS.map((n) => ({
  id: `review-${n}`,
  title: `Del error se aprende: ${n}`,
  description: `${n} ejercicios que fallaste y luego acertaste.`,
  icon: '🧠',
  category: 'volume' as const,
}));

const CURIOSITY: Achievement[] = [
  {
    id: 'curiosity-about',
    title: 'Vista al taller',
    description: 'Visita la página "Sobre el proyecto".',
    icon: '🔍',
    category: 'milestone',
  },
  {
    id: 'curiosity-language',
    title: 'Multilingüe en potencia',
    description: 'Abre el selector de idioma.',
    icon: '🌐',
    category: 'milestone',
  },
];

const masteryOf = (unitId: string, title: string): Achievement => ({
  id: `unit-complete-${unitId}`,
  title: `Maestría: ${title}`,
  description: `Completa todas las lecciones de la unidad "${title}".`,
  icon: '📘',
  category: 'mastery',
});

const perfectOf = (unitId: string, title: string): Achievement => ({
  id: `perfect-unit-${unitId}`,
  title: `Impecable: ${title}`,
  description: `Todas las lecciones de la unidad «${title}» en verde.`,
  icon: '🌟',
  category: 'mastery',
});

const levelDone = (level: string): Achievement => ({
  id: `level-complete-${level}`,
  title: `Nivel ${level.toUpperCase()} completo`,
  description: `Completa todas las lecciones del nivel ${level.toUpperCase()}.`,
  icon: '🏆',
  category: 'volume',
});

/**
 * Catálogo de los niveles abiertos del idioma (se construye en cliente con las
 * unidades que trae la página). `held` = ids que el usuario ya tiene: los
 * retirados del catálogo (LEGACY_ACHIEVEMENTS) se siguen mostrando a quien los tenga.
 */
export function buildCatalog(
  unitsByLevel: Record<string, { unitIds: string[] }>,
  opts: { titles?: Record<string, string>; held?: Iterable<string> } = {},
): Achievement[] {
  const titles = opts.titles ?? {};
  const held = new Set(opts.held ?? []);
  const levels = Object.keys(unitsByLevel);
  const units = levels.flatMap((l) => unitsByLevel[l]?.unitIds ?? []);
  const titleOf = (u: string) => titles[u] ?? A1_SHORT[u] ?? u;
  return [
    ...MILESTONES_BEFORE,
    ...(held.has(FIRST_LEVEL.id) ? [FIRST_LEVEL] : []),
    ...MILESTONES_AFTER,
    ...units.map((u) => masteryOf(u, titleOf(u))),
    ...units.map((u) => perfectOf(u, titleOf(u))),
    ...STREAKS,
    ...VOLUME,
    ...(levels.includes('a1') ? [VOLUME_A1] : []),
    ...levels.filter((l) => l !== 'a1').map(levelDone),
    ...REVIEW,
    ...CURIOSITY,
  ];
}

/** Catálogo por defecto (solo A1), para quien no tenga las unidades a mano. */
export const ACHIEVEMENTS: Achievement[] = buildCatalog({ a1: { unitIds: A1_UNITS.map((u) => u.unitId) } });

// Lookup rápido por id → catálogo (incluye los retirados). Para las unidades de
// otros niveles, ver achievement-text.ts.
export const ACHIEVEMENT_BY_ID: Record<string, Achievement> =
  Object.fromEntries([...ACHIEVEMENTS, ...LEGACY_ACHIEVEMENTS].map((a) => [a.id, a]));

// IDs de logros que NO se pueden inferir solo del progreso (requieren un
// trigger explícito: clic, navegación, llamada al exportador). El evaluador
// los ignora; el código que los dispara debe llamar a `unlockAchievements`
// directamente con el id correspondiente.
const TRIGGER_ONLY_IDS = new Set([
  'first-export',
  'first-import',
  'curiosity-about',
  'curiosity-language',
]);

/**
 * Evalúa qué logros están desbloqueados según el estado del progreso.
 * Pura: dado el mismo input, mismo output. No muta nada, no toca storage.
 *
 * @param progress         Estado actual del progreso (ya migrado).
 * @param knownLessonKeys  Conjunto de IDs de lecciones que existen en el sitio.
 * @param unitsByLevel     Mapa nivel → { unitIds: string[] }. Para detectar
 *                         "A1 completo" y "primera unidad".
 *                         Las claves de unitIds son los IDs estables de las
 *                         unidades (`a1-greetings`, etc.), no slugs.
 * @returns Array de IDs de logros desbloqueados (sin orden garantizado).
 *
 * Notas:
 * - Para streaks usa `progress.streak.longest` (no `current`), así un logro
 *   de racha no se "pierde" si el usuario rompe la racha.
 * - "A1 completo" requiere que el llamante pase los lessonIds que pertenecen
 *   a cada unitId. Como el catálogo no conoce las lecciones (eso vive en
 *   content collections), aquí solo recibimos la unión.
 * - Los logros tipo trigger (export/import/curiosity) se desbloquean fuera
 *   de aquí y se conservan si ya estaban en `progress.achievements`.
 */
export function evaluate(
  progress: ProgressV1,
  knownLessonKeys: Set<string>,
  unitsByLevel: Record<string, { unitIds: string[] }>,
  lessonsByUnit?: Record<string, string[]>,
  content: { index?: LessonIndex } = {},
): string[] {
  const unlocked: Set<string> = new Set();

  // Conserva logros que ya estaban marcados (incluidos los trigger-only y los
  // retirados del catálogo, como «Nivel superado»).
  if (progress.achievements) {
    for (const id of Object.keys(progress.achievements)) {
      unlocked.add(id);
    }
  }

  const lessonEntries = Object.entries(progress.lessons);
  const startedLessons = lessonEntries.filter(([key]) => knownLessonKeys.has(key));
  const completedLessons = startedLessons.filter(([, l]) => l.status === 'completed');

  // ---------- Milestones derivables del progreso ----------
  if (startedLessons.length > 0) unlocked.add('first-step');
  if (completedLessons.length > 0) unlocked.add('first-completed');

  // ---------- Volume ----------
  const completedCount = completedLessons.length;
  if (completedCount >= 10) unlocked.add('volume-10');
  if (completedCount >= 25) unlocked.add('volume-25');
  if (completedCount >= 50) unlocked.add('volume-50');

  // ---------- Streaks (usar `longest`) ----------
  const longest = progress.streak.longest;
  if (longest >= 3) unlocked.add('streak-3');
  if (longest >= 7) unlocked.add('streak-7');
  if (longest >= 14) unlocked.add('streak-14');
  if (longest >= 30) unlocked.add('streak-30');

  // ---------- Maestría por unidad, «primera unidad» y niveles ----------
  // Sin `lessonsByUnit` no se sabe qué lecciones tiene cada unidad: no se marca
  // nada nuevo de esto. Se recorren las unidades que llegan (A1, A2…), no el catálogo.
  const completedSet = new Set(completedLessons.map(([k]) => k));
  const unitDone = (uid: string) => {
    const ids = lessonsByUnit?.[uid];
    return !!ids && ids.length > 0 && ids.every((lid) => completedSet.has(lid));
  };
  if (lessonsByUnit) {
    let anyUnitComplete = false;
    for (const unitId of Object.keys(lessonsByUnit)) {
      if (unitDone(unitId)) {
        unlocked.add(`unit-complete-${unitId}`);
        anyUnitComplete = true;
      }
    }
    if (anyUnitComplete) unlocked.add('first-unit');
    // Nivel completo: A1 conserva su id de siempre; el resto, `level-complete-<nivel>`.
    // «Nivel superado» (first-level) ya no se concede: repetía «A1 completo».
    for (const [level, { unitIds }] of Object.entries(unitsByLevel)) {
      if (unitIds.length > 0 && unitIds.every(unitDone)) {
        unlocked.add(level === 'a1' ? 'volume-a1-complete' : `level-complete-${level}`);
      }
    }
  }

  // ---------- Con el índice de lecciones: verde y fallos corregidos ----------
  const index = content.index;
  if (index) {
    const perfect = (id: string) => {
      const e = index[id];
      return !!e && lessonState(progress.lessons[id], e.ex, e.g).state === 'perfect';
    };
    if (Object.keys(index).some((id) => progress.lessons[id] && perfect(id))) unlocked.add('first-perfect');
    if (lessonsByUnit) {
      for (const [unitId, ids] of Object.entries(lessonsByUnit)) {
        if (ids.length > 0 && ids.every(perfect)) unlocked.add(`perfect-unit-${unitId}`);
      }
    }
    let fixed = 0;
    for (const [id, e] of Object.entries(index)) {
      const ex = progress.lessons[id]?.exercises;
      if (!ex) continue;
      for (const g of e.g) {
        const r = ex[g];
        if (r && (r.fails ?? 0) > 0 && r.bestScore === 100) fixed++;
      }
    }
    for (const n of REVIEW_STEPS) if (fixed >= n) unlocked.add(`review-${n}`);
  }

  // ---------- Has vuelto (actividad real tras ≥ 8 días) ----------
  if (hasComeback(progress.activity, derivedDays(progress))) unlocked.add('comeback');

  // Filtra trigger-only para no marcarlos por error: solo permanecen si ya
  // estaban en `progress.achievements` (lo que ya añadimos arriba).
  for (const id of TRIGGER_ONLY_IDS) {
    if (!progress.achievements?.[id]) {
      unlocked.delete(id);
    }
  }

  return Array.from(unlocked);
}

/**
 * Logros que tocan en una lección y aún no están guardados (para anunciarlos en
 * la tarjeta de cierre). Solo sabe de su unidad, así que nunca concede niveles, y
 * cuenta las lecciones de niveles abiertos (como la página de progreso): ni las
 * de niveles con candado ni las claves antiguas sin traducir.
 */
export function lessonAchievements(progress: ProgressV1, unitId: string, unitIndex: LessonIndex): string[] {
  const ids = Object.keys(unitIndex);
  if (!unitId || !ids.length) return [];
  const known = new Set(
    Object.keys(progress.lessons).filter((k) => !k.includes('/') && !LOCKED_PATHS.includes(k.split('-')[0])),
  );
  return evaluate(progress, known, {}, { [unitId]: ids }, { index: unitIndex })
    .filter((id) => !progress.achievements?.[id]);
}
