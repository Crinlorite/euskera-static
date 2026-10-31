import { getCollection } from 'astro:content';
import type { APIRoute, GetStaticPaths } from 'astro';
import { ACTIVE_LOCALES } from '../../../i18n/config';
import { LOCKED_PATHS } from '../../../lib/locked.mjs';
import { GRADED_TYPES } from '../../../lib/lesson-state';
import type { ReviewExercise, ReviewUnitData } from '../../../lib/review';

// Ejercicios de repaso de una unidad: `/{locale}/repaso/{unitId}.json`. Los pide
// la página de repaso solo para las unidades que tienen algo en la cola, así las
// páginas de lección no cargan con nada. Solo los corregibles: las flashcards
// nunca se repasan. Los niveles bajo candado no tienen repaso (tampoco entran en
// el índice de la página).

interface Props {
  locale: string;
  level: string;
  unitCode: string;
}

export const getStaticPaths = (async () => {
  const units = await getCollection('units');
  return units
    .map((u) => ({ u, seg: u.id.split('/') }))
    .filter(({ seg }) => (ACTIVE_LOCALES as readonly string[]).includes(seg[0]) && !LOCKED_PATHS.includes(seg[1]))
    .map(({ u, seg }) => ({
      params: { locale: seg[0], unitId: u.data.id },
      props: { locale: seg[0], level: seg[1], unitCode: u.data.code } satisfies Props,
    }));
}) satisfies GetStaticPaths;

export const GET: APIRoute<Props> = async ({ params, props }) => {
  const { locale, level, unitCode } = props;
  const prefix = `${locale}/${level}/${unitCode}/`;
  const lessons = (await getCollection('lessons'))
    .filter((l) => l.id.startsWith(prefix))
    .sort((a, b) => a.data.order - b.data.order);
  const body: ReviewUnitData = {
    unitId: String(params.unitId),
    lessons: lessons.map((l) => ({
      id: l.data.id,
      title: l.data.title,
      href: `/${locale}/${level}/${unitCode}/${l.data.code}/`,
      exercises: l.data.exercises.filter((e): e is ReviewExercise => GRADED_TYPES.has(e.type)),
    })),
  };
  return new Response(JSON.stringify(body), {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
};
