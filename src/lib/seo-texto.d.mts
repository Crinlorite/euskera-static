export declare function minimoDescripcion(locale: string): number;
export declare function sinMarcado(s: string): string;
export declare function primerParrafo(md: string): string | null;
export declare function recorta(texto: string, max?: number): string;
export declare function descripcionDeLeccion(
  cuerpo: string | null | undefined,
  respaldo: string,
  minimo?: number,
): string;
export declare function ajusta(
  texto: string | null | undefined,
  respaldo: string,
  minimo?: number,
  max?: number,
): string;
export declare function cierra(texto: string | null | undefined, minimo?: number): string;
