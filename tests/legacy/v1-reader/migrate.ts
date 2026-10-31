// LECTOR ANTIGUO CONGELADO — NO EDITAR.
// Copia literal de emptyProgress(), LEGACY_UNIT_SLUG_TO_ID, migrateLegacyLessonKey()
// y migrate() de src/stores/progress.ts tal como estaban antes de la fase 0.
// (emptyProgress no estaba exportada; se copia porque migrate() la usa.)
import type { LessonProgress, ProgressAny, ProgressV1 } from './types.ts';

function emptyProgress(): ProgressV1 {
  const now = new Date().toISOString();
  return {
    schemaVersion: 1,
    createdAt: now,
    lastUpdated: now,
    lessons: {},
    streak: { current: 0, longest: 0, lastStudiedDate: '' },
    preferences: {},
    achievements: {},
  };
}

// Migración path-based legacy → opaque IDs estables.
// Antes (v0.x) las claves de `lessons` eran paths tipo "a1/01-saludos/01-kaixo".
// Ahora son IDs opacos como "a1-greetings-1". Cuando importamos un hash antiguo
// (o leemos un localStorage de antes), traducimos las claves.
const LEGACY_UNIT_SLUG_TO_ID: Record<string, string> = {
  '01-saludos':            'a1-greetings',
  '02-familia':            'a1-family',
  '03-nolakoa-zara':       'a1-descriptions',
  '04-kafe-goxoa':         'a1-bar-food',
  '05-auzoko-euskaltegia': 'a1-town',
  '06-maritxu-nora-zoaz':  'a1-directions',
  '07-bizimodua':          'a1-routine',
  '08-zer-egin-duzu':      'a1-recent-past',
  '09-etxean-jan-eta-lan': 'a1-home',
  '10-auzokideak':         'a1-people',
  '11-erosi-eta-egin':     'a1-shopping',
  '12-jatetxean':          'a1-restaurant',
  '13-asteko-agenda':      'a1-week-plan',
};

function migrateLegacyLessonKey(key: string): string | null {
  // Detecta si la clave es path-based ("a1/<unit-slug>/<lesson-slug>") y la
  // traduce a ID nuevo "<unit-id>-<order>" — null si no se puede mapear.
  if (!key.includes('/')) return null; // ya es ID nuevo
  const parts = key.split('/');
  if (parts.length !== 3) return null;
  const [, unitSlug, lessonSlug] = parts;
  const unitId = LEGACY_UNIT_SLUG_TO_ID[unitSlug];
  if (!unitId) return null;
  const orderMatch = lessonSlug.match(/^(\d+)/);
  if (!orderMatch) return null;
  const order = parseInt(orderMatch[1], 10);
  return `${unitId}-${order}`;
}

export function migrate(p: ProgressAny): ProgressV1 {
  if (p.schemaVersion !== 1) return emptyProgress();
  // Si hay claves legacy en lessons, traducirlas
  const lessons: Record<string, LessonProgress> = {};
  for (const [key, value] of Object.entries(p.lessons)) {
    if (key.includes('/')) {
      const newKey = migrateLegacyLessonKey(key);
      if (newKey) {
        lessons[newKey] = value;
      }
      // Si no se puede mapear (clave desconocida), la descartamos silenciosamente
    } else {
      lessons[key] = value;
    }
  }
  // Backwards-compat: hashes antiguos no traen `achievements`. Garantizamos
  // que el campo siempre exista para que el resto del código no vea undefined.
  const achievements = p.achievements ?? {};
  return { ...p, lessons, achievements };
}
