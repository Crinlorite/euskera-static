type Frase = { texto: string; traduccion: string | null };
export declare function cortaDe(traducciones: { texto: string }[]): string;
export declare function grupoSeo(slug: string): 'A' | 'B';
export declare function tituloEntrada(e: {
  hitza: string; corta: string; ejemplos?: Frase[]; grupo: 'A' | 'B';
}): string;
export declare function descripcionEntrada(e: {
  hitza: string; principal: string; corta: string; ejemplos?: Frase[];
  grupo: 'A' | 'B'; respaldo: string; minimo?: number;
}): string;
export declare function descripcionConFrase(e: { hitza: string; corta: string; ejemplos?: Frase[] }): string | null;
export declare function brazo(e: { slug: string; hitza: string; corta: string; ejemplos?: Frase[] }): 'tratada' | 'control' | 'fuera';
export declare function migas(e: {
  sitio: string; locale: string; hitza: string; slug: string; hiztegia: string;
}): Record<string, unknown>;
