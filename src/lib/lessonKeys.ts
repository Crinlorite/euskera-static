import { getCollection } from 'astro:content';

export async function listLessonKeys(locale: string): Promise<string[]> {
  const all = await getCollection('lessons');
  return all
    .filter((l) => l.id.startsWith(`${locale}/`))
    .map((l) => l.id.split('/').slice(1).join('/').replace(/\.[^.]+$/, ''));
}
