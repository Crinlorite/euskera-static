export declare const SITIO: string;
export declare const LOCALES: string[];
export declare const POR_DEFECTO: string;
export declare const RUTAS_FIJAS: string[];
export declare function separaLocale(pathname: string): { locale: string | null; ruta: string };
export declare function construye(
  ruta: string,
  locales: Iterable<string>,
): { hreflang: string; href: string }[];
