import type { LocaleCode } from './config';

export type StringKey =
  | 'site.name' | 'site.tagline'
  | 'nav.home' | 'nav.levels' | 'nav.about' | 'nav.language' | 'nav.progress'
  | 'home.hero.title' | 'home.hero.sub' | 'home.cta.start'
  | 'levels.upcoming'
  | 'unit.lessons' | 'unit.estimated'
  | 'lesson.next' | 'lesson.prev'
  | 'lesson.completed' | 'lesson.read'
  | 'progress.streak.days'
  | 'progress.summary.lessons' | 'progress.summary.record'
  | 'progress.export.title' | 'progress.export.copy' | 'progress.export.download' | 'progress.export.share'
  | 'progress.export.help'
  | 'progress.import.title' | 'progress.import.do' | 'progress.import.invalid' | 'progress.import.overwrite'
  | 'progress.import.outdated' | 'progress.import.skipped'
  | 'guest.banner'
  | 'lang.choose' | 'lang.beta' | 'lang.upcoming' | 'lang.help-translate'
  | 'about.title'
  | 'beta.banner'
  | 'common.cancel' | 'common.continue' | 'common.close' | 'common.copy' | 'common.download'
  | 'common.check' | 'common.skip' | 'common.skip-content'
  | 'sources.statement';

const STRINGS: Record<LocaleCode, Partial<Record<StringKey, string>>> = {
  'es': {
    'site.name': 'Euskera',
    'site.tagline': 'Aprende euskera, gratis y para todos.',
    'nav.home': 'Inicio',
    'nav.levels': 'Niveles',
    'nav.about': 'Sobre',
    'nav.language': 'Idioma',
    'nav.progress': 'Progreso',
    'home.hero.title': 'Aprende euskera',
    'home.hero.sub': 'Gratis · Sin login · Para todos',
    'home.cta.start': 'Empezar por el A1',
    'levels.upcoming': 'Próximamente',
    'unit.lessons': 'Lecciones',
    'unit.estimated': 'Tiempo estimado',
    'lesson.next': 'Siguiente',
    'lesson.prev': 'Anterior',
    'lesson.completed': 'Lección completada',
    'lesson.read': 'Leída',
    'progress.streak.days': 'días seguidos',
    'progress.summary.lessons': 'lecciones empezadas',
    'progress.summary.record': 'récord',
    'progress.export.title': 'Guardar mi progreso',
    'progress.export.copy': 'Copiar al portapapeles',
    'progress.export.download': 'Descargar archivo',
    'progress.export.share': 'Compartir',
    'progress.export.help': 'Pega esto en tus notas o mándatelo a ti mismo. Cuando vuelvas en otro dispositivo, pégalo en "Restaurar progreso" y seguirás donde lo dejaste.',
    'progress.import.title': 'Restaurar progreso',
    'progress.import.do': 'Importar',
    'progress.import.invalid': 'No reconozco este código. ¿Lo copiaste completo?',
    'progress.import.overwrite': 'Esto sobrescribirá tu progreso actual. ¿Continuar?',
    'progress.import.outdated': 'Este código es de una versión más reciente. Actualiza la página.',
    'progress.import.skipped': 'Restaurado. Algunas lecciones ya no existen y se han saltado.',
    'guest.banner': 'Modo invitado: tu progreso solo dura esta sesión. Exporta antes de cerrar.',
    'lang.choose': 'Elige tu idioma',
    'lang.beta': 'Beta',
    'lang.upcoming': 'Próximamente · ayúdanos en GitHub',
    'lang.help-translate': '¿Hablas este idioma? Ayúdanos a traducir',
    'about.title': 'Sobre el proyecto',
    'beta.banner': 'Esta traducción está en beta — si ves algo raro, avísanos.',
    'common.cancel': 'Cancelar',
    'common.continue': 'Continuar',
    'common.close': 'Cerrar',
    'common.copy': 'Copiar',
    'common.download': 'Descargar',
    'common.check': 'Comprobar',
    'common.skip': 'Saltar',
    'common.skip-content': 'Saltar al contenido',
    'sources.statement': 'El currículum sigue los estándares CEFR oficiales para los niveles A1-C2 del euskera. Las explicaciones, ejemplos y ejercicios son material original. Vocabulario y reglas gramaticales son hechos lingüísticos de dominio público.',
  },
  'en': {}, 'ar': {}, 'fr': {}, 'ro': {}, 'pt-BR': {},
  'de': {}, 'it': {}, 'ru': {}, 'pl': {}, 'zh-Hans': {}, 'ja': {}, 'ko': {},
};

export function t(locale: LocaleCode, key: StringKey): string {
  return STRINGS[locale]?.[key] ?? STRINGS['es']?.[key] ?? key;
}
