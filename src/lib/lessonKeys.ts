import { getCollection } from 'astro:content';

// Devuelve los IDs estables (no slugs) de todas las lecciones del locale.
// Se usa para validar imports de memory card: los IDs aquí son la fuente
// de verdad de "qué lecciones existen actualmente".
export async function listLessonKeys(locale: string): Promise<string[]> {
  const all = await getCollection('lessons');
  return all
    .filter((l) => l.id.startsWith(`${locale}/`))
    .map((l) => l.data.id);
}
