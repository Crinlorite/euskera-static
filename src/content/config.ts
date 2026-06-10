import { defineCollection, z } from 'astro:content';

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
        code: z.ZodIssueCode.custom,
        message: `${ex.id}: answer=${ex.answer} fuera de rango (${ex.options.length} opciones)`,
      });
    }
    if (ex.type === 'fill-in-blank' && !/_{3,}/.test(ex.prompt)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `${ex.id}: prompt sin hueco "___"`,
      });
    }
  }
});

const levels = defineCollection({
  type: 'data',
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
  type: 'data',
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
  type: 'content',
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
