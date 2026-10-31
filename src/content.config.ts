import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

// Los ids se generan EXACTAMENTE como en las colecciones heredadas de Astro 4
// (ruta relativa tal cual, sin pasarla a minúsculas): niveles y unidades sin
// extensión ("pt-BR/a2"), lecciones con ella ("es/a1/01-saludos/01-kaixo.md").
// Todo el enrutado y hiztegia/[hitza].astro dependen de ese formato.
const sinExtension = ({ entry }: { entry: string }) => entry.replace(/\.ya?ml$/, '');
const talCual = ({ entry }: { entry: string }) => entry;

const exerciseBase = z.object({
  id: z.string().min(1),
});

const multipleChoice = exerciseBase.extend({
  type: z.literal('multiple-choice'),
  prompt: z.string(),
  options: z.array(z.string()).min(2),
  answer: z.number().int().nonnegative(),
  explanation: z.string().optional(),
});

const fillInBlank = exerciseBase.extend({
  type: z.literal('fill-in-blank'),
  prompt: z.string(),
  answers: z.array(z.string()).min(1),
  explanation: z.string().optional(),
});

const flashcards = exerciseBase.extend({
  type: z.literal('flashcards'),
  cards: z.array(z.object({ eu: z.string(), es: z.string() })).min(1),
});

const matchPairs = exerciseBase.extend({
  type: z.literal('match-pairs'),
  pairs: z.array(z.object({ eu: z.string(), es: z.string() })).min(2),
});

const exercise = z.discriminatedUnion('type', [
  multipleChoice, fillInBlank, flashcards, matchPairs,
]);

// Validaciones de integridad que el shape no cubre. Van sobre el array
// (no sobre los miembros de la union) porque discriminatedUnion solo
// acepta ZodObject puros, no ZodEffects.
const exercises = z.array(exercise).superRefine((arr, ctx) => {
  for (const ex of arr) {
    if (ex.type === 'multiple-choice' && ex.answer >= ex.options.length) {
      ctx.addIssue({
        code: 'custom',
        message: `${ex.id}: answer=${ex.answer} fuera de rango (${ex.options.length} opciones)`,
      });
    }
    if (ex.type === 'fill-in-blank' && !/_{3,}/.test(ex.prompt)) {
      ctx.addIssue({
        code: 'custom',
        message: `${ex.id}: prompt sin hueco "___"`,
      });
    }
  }
});

const levels = defineCollection({
  loader: glob({ pattern: '**/[^_]*.{yaml,yml}', base: './src/content/levels', generateId: sinExtension }),
  schema: z.object({
    code: z.string(),
    name: z.string(),
    description: z.string(),
    order: z.number().int().positive(),
    status: z.enum(['active', 'placeholder', 'upcoming']),
    curriculum: z.array(z.object({
      id: z.string(),
      title: z.string(),
    })).default([]),
    beta: z.boolean().default(false),
  }),
});

const units = defineCollection({
  loader: glob({ pattern: '**/[^_]*.{yaml,yml}', base: './src/content/units', generateId: sinExtension }),
  schema: z.object({
    // Stable opaque identifier — never changes aunque renombres el slug.
    // Lo usan progress store, referencias internas, futuras migraciones.
    id: z.string().min(1),
    code: z.string(),               // slug actual (parte de la URL)
    level: z.string(),
    title: z.string(),
    order: z.number().int().positive(),
    covers: z.array(z.string()).default([]),
    description: z.string(),
    estimatedMinutes: z.number().int().positive().default(30),
  }),
});

const lessons = defineCollection({
  loader: glob({ pattern: '**/[^_]*.md', base: './src/content/lessons', generateId: talCual }),
  schema: z.object({
    // Stable opaque identifier — clave del progreso, no cambia aunque renombres el slug.
    id: z.string().min(1),
    unitId: z.string().min(1),      // referencia estable al unit por su id (no slug)
    code: z.string(),               // slug actual de la lección
    unit: z.string(),               // slug del unit (parte de la URL)
    level: z.string(),
    order: z.number().int().positive(),
    title: z.string(),
    estimatedMinutes: z.number().int().positive().default(10),
    covers: z.array(z.string()).default([]),
    exercises: exercises.default([]),
  }),
});

export const collections = { levels, units, lessons };
export type Exercise = z.infer<typeof exercise>;
