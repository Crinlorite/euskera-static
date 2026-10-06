export interface AppDelEstudio {
  id: string; nombre: string; icono: string; web: string; appStore: string; play: string | null; locales: string[];
  playBeta?: { paquete: string; grupo: string; prueba: string };
}
export interface TextosMasApps {
  antetitulo: string; antes: string; despues: string; entradilla: string; apps: Record<string, string>;
}
export type Dispositivo = 'ios' | 'android' | 'otro';
export declare const APPS: AppDelEstudio[];
export declare const LOCALES_ACTIVOS: string[];
export declare const TEXTOS: Record<string, TextosMasApps>;
export declare const PLAY_HL: Record<string, string>;
export declare function appsDe(locale: string): AppDelEstudio[];
export declare function seMuestraEn(locale: string): boolean;
export declare function dispositivoDe(e?: { plataforma?: string; ua?: string; toques?: number }): Dispositivo;
export declare function enlaceDe(app: AppDelEstudio, dispositivo: Dispositivo, donde?: { pais?: string; hl?: string; locale?: string }): string | null;
export declare const AVISO_PRIVACIDAD: Record<string, string>;
export declare function avisoPrivacidad(locale: string): string | null;
export declare function tituloDe(locale: string): string;
export declare const TITULO_BETA: Record<string, string>;
export declare function rutaBeta(app: AppDelEstudio, locale: string): string;
export declare function esBetaEnAndroid(app: AppDelEstudio): boolean;
export declare const NOTA_MENORES: Record<string, string>;
export declare const PROXIMAMENTE: { id: string; nombre: string; icono: string; ruta: string }[];
