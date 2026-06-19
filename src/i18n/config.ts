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
  'ca': { code: 'ca', name: 'Català', dir: 'ltr', status: 'beta' },
  'gl': { code: 'gl', name: 'Galego', dir: 'ltr', status: 'beta' },
  'eu': { code: 'eu', name: 'Euskara', dir: 'ltr', status: 'planned' },
  'oc': { code: 'oc', name: 'Occitan (aranés)', dir: 'ltr', status: 'beta' },
  'ast': { code: 'ast', name: 'Asturianu', dir: 'ltr', status: 'beta' },
  'an': { code: 'an', name: 'Aragonés', dir: 'ltr', status: 'beta' },
  // Resto del roadmap
  'en': { code: 'en', name: 'English', dir: 'ltr', status: 'active' },
  'ar': { code: 'ar', name: 'العربية', dir: 'rtl', status: 'beta', font: 'Noto Sans Arabic' },
  'fr': { code: 'fr', name: 'Français', dir: 'ltr', status: 'beta' },
  'ro': { code: 'ro', name: 'Română', dir: 'ltr', status: 'beta' },
  'pt-BR': { code: 'pt-BR', name: 'Português (Brasil)', dir: 'ltr', status: 'beta' },
  'de': { code: 'de', name: 'Deutsch', dir: 'ltr', status: 'beta' },
  'it': { code: 'it', name: 'Italiano', dir: 'ltr', status: 'beta' },
  'ru': { code: 'ru', name: 'Русский', dir: 'ltr', status: 'beta' },
  'pl': { code: 'pl', name: 'Polski', dir: 'ltr', status: 'beta' },
  'zh-Hans': { code: 'zh-Hans', name: '简体中文', dir: 'ltr', status: 'beta', font: 'Noto Sans SC' },
  'ja': { code: 'ja', name: '日本語', dir: 'ltr', status: 'beta', font: 'Noto Sans JP' },
  'ko': { code: 'ko', name: '한국어', dir: 'ltr', status: 'beta', font: 'Noto Sans KR' },
};

export const ACTIVE_LOCALES: LocaleCode[] = Object.values(LANGUAGES)
  .filter((l) => l.status === 'active' || l.status === 'beta')
  .map((l) => l.code);
