export type LocaleCode =
  | 'es' | 'ca' | 'gl' | 'eu' | 'ast' | 'an' | 'oc'
  | 'en' | 'ar' | 'fr' | 'ro' | 'pt-BR'
  | 'de' | 'it' | 'ru' | 'pl' | 'zh-Hans' | 'ja' | 'ko';

export interface LocaleInfo {
  code: LocaleCode;
  name: string;
  dir: 'ltr' | 'rtl';
  status: 'active' | 'beta' | 'planned';
  font?: string;
}

export const DEFAULT_LOCALE: LocaleCode = 'es';

export const LANGUAGES: Record<LocaleCode, LocaleInfo> = {
  'es': { code: 'es', name: 'Castellano', dir: 'ltr', status: 'active' },
  // Cooficiales y reconocidas con protección legal en la Península
  'ca': { code: 'ca', name: 'Català', dir: 'ltr', status: 'planned' },
  'gl': { code: 'gl', name: 'Galego', dir: 'ltr', status: 'planned' },
  'eu': { code: 'eu', name: 'Euskara', dir: 'ltr', status: 'planned' },
  'oc': { code: 'oc', name: 'Occitan (aranés)', dir: 'ltr', status: 'planned' },
  'ast': { code: 'ast', name: 'Asturianu', dir: 'ltr', status: 'planned' },
  'an': { code: 'an', name: 'Aragonés', dir: 'ltr', status: 'planned' },
  // Resto del roadmap
  'en': { code: 'en', name: 'English', dir: 'ltr', status: 'planned' },
  'ar': { code: 'ar', name: 'العربية', dir: 'rtl', status: 'planned', font: 'Noto Sans Arabic' },
  'fr': { code: 'fr', name: 'Français', dir: 'ltr', status: 'planned' },
  'ro': { code: 'ro', name: 'Română', dir: 'ltr', status: 'planned' },
  'pt-BR': { code: 'pt-BR', name: 'Português (Brasil)', dir: 'ltr', status: 'planned' },
  'de': { code: 'de', name: 'Deutsch', dir: 'ltr', status: 'planned' },
  'it': { code: 'it', name: 'Italiano', dir: 'ltr', status: 'planned' },
  'ru': { code: 'ru', name: 'Русский', dir: 'ltr', status: 'planned' },
  'pl': { code: 'pl', name: 'Polski', dir: 'ltr', status: 'planned' },
  'zh-Hans': { code: 'zh-Hans', name: '简体中文', dir: 'ltr', status: 'planned', font: 'Noto Sans SC' },
  'ja': { code: 'ja', name: '日本語', dir: 'ltr', status: 'planned', font: 'Noto Sans JP' },
  'ko': { code: 'ko', name: '한국어', dir: 'ltr', status: 'planned', font: 'Noto Sans KR' },
};

export const ACTIVE_LOCALES: LocaleCode[] = Object.values(LANGUAGES)
  .filter((l) => l.status === 'active' || l.status === 'beta')
  .map((l) => l.code);
