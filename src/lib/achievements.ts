import type { ProgressV1 } from '../stores/progress';

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

const masteryAchievements: Achievement[] = A1_UNITS.map(({ unitId, shortTitle }) => ({
  id: `unit-complete-${unitId}`,
  title: `Maestría: ${shortTitle}`,
  description: `Completa todas las lecciones de la unidad "${shortTitle}".`,
  icon: '📘',
  category: 'mastery',
}));

export const ACHIEVEMENTS: Achievement[] = [
  // ---------- Milestones ----------
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
    id: 'first-unit',
    title: 'Primera unidad',
    description: 'Completa todas las lecciones de tu primera unidad.',
    icon: '🎯',
    category: 'milestone',
  },
  {
    id: 'first-level',
    title: 'Nivel superado',
    description: 'Completa todas las lecciones del nivel A1.',
    icon: '🏔️',
    category: 'milestone',
  },
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

  // ---------- Mastery (una por unidad A1) ----------
  ...masteryAchievements,

  // ---------- Streaks ----------
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

  // ---------- Volume ----------
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
  {
    id: 'volume-a1-complete',
    title: 'A1 completo',
    description: 'Completa todas las lecciones del nivel A1.',
    icon: '🏆',
    category: 'volume',
  },

  // ---------- Curiosity ----------
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

// Lookup rápido por id → catálogo. Útil desde la UI cuando solo tienes el id.
export const ACHIEVEMENT_BY_ID: Record<string, Achievement> =
  Object.fromEntries(ACHIEVEMENTS.map((a) => [a.id, a]));

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
): string[] {
  const unlocked: Set<string> = new Set();

  // Conserva logros que ya estaban marcados (incluidos los trigger-only).
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

  // ---------- Mastery por unidad y "primera unidad" ----------
  // Necesitamos saber qué lecciones pertenecen a cada unidad. Si el llamante
  // no nos pasa `lessonsByUnit`, no podemos evaluar mastery (lo dejamos en
  // el estado en que esté, sin marcar nada nuevo).
  const completedSet = new Set(completedLessons.map(([k]) => k));
  let anyUnitComplete = false;
  if (lessonsByUnit) {
    for (const a of ACHIEVEMENTS) {
      if (a.category !== 'mastery') continue;
      // Mastery IDs son `unit-complete-<unitId>`
      const unitId = a.id.replace(/^unit-complete-/, '');
      const lessonsOfUnit = lessonsByUnit[unitId];
      if (!lessonsOfUnit || lessonsOfUnit.length === 0) continue;
      const allDone = lessonsOfUnit.every((lid) => completedSet.has(lid));
      if (allDone) {
        unlocked.add(a.id);
        anyUnitComplete = true;
      }
    }
  }
  if (anyUnitComplete) unlocked.add('first-unit');

  // ---------- Nivel A1 completo ----------
  // Recorre todas las unidades A1 y comprueba que todas sus lecciones estén
  // completadas. Si `lessonsByUnit` no se pasa, no podemos evaluar.
  if (lessonsByUnit && unitsByLevel.a1) {
    const a1UnitIds = unitsByLevel.a1.unitIds;
    if (a1UnitIds.length > 0) {
      const allA1Done = a1UnitIds.every((uid) => {
        const lessons = lessonsByUnit[uid];
        if (!lessons || lessons.length === 0) return false;
        return lessons.every((lid) => completedSet.has(lid));
      });
      if (allA1Done) {
        unlocked.add('volume-a1-complete');
        unlocked.add('first-level');
      }
    }
  }

  // Filtra trigger-only para no marcarlos por error: solo permanecen si ya
  // estaban en `progress.achievements` (lo que ya añadimos arriba).
  for (const id of TRIGGER_ONLY_IDS) {
    if (!progress.achievements?.[id]) {
      unlocked.delete(id);
    }
  }

  return Array.from(unlocked);
}
