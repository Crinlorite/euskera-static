export interface AppDelEstudio {
  id: string; nombre: string; icono: string; web: string; appStore: string; play: string | null;
}
export type Dispositivo = 'ios' | 'android' | 'otro';
export declare const APPS: AppDelEstudio[];
export declare const LOCALES_ACTIVOS: string[];
export declare const TEXTOS: Record<string, [string, string, string, string, string]>;
export declare function seMuestraEn(locale: string): boolean;
export declare function dispositivoDe(e?: { plataforma?: string; ua?: string; toques?: number }): Dispositivo;
export declare function enlaceDe(app: AppDelEstudio, dispositivo: Dispositivo, pais?: string): string | null;
export declare const AVISO_PRIVACIDAD: Record<string, string>;
export declare function avisoPrivacidad(locale: string): string | null;
