import { z } from 'zod';
import { inputWordSchema } from './word';
import { lessonSteps } from '../practice';
export const evidenceSchema = z
  .array(
    z.object({
      skill: z.enum(['meaning', 'context', 'distinction', 'recall', 'application']),
      correct: z.boolean(),
    }),
  )
  .max(12);
export const sessionSchema = z
  .object({
    id: z.uuid(),
    kind: z.enum(['learn', 'review']),
    day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    words: z.array(z.string().min(2).max(60)).min(1).max(30),
    index: z.number().int().min(0).max(29),
    step: z.number().int().min(0).max(11),
    steps: z.array(z.enum(lessonSteps)).min(1).max(12),
    answer: z.number().int().min(0).max(3).nullable(),
    text: z.string().max(2000),
    sentence: z.string().max(2000),
    checked: z.boolean(),
    mistakes: z.number().int().min(0).max(12),
    confidence: z.number().int().min(0).max(4),
    eventId: z.uuid(),
    evidence: evidenceSchema,
  })
  .refine(
    (d) =>
      d.index < d.words.length &&
      d.step < d.steps.length &&
      new Set(d.words).size === d.words.length,
    'This saved session is invalid.',
  );
export const practiceCommands = [
  z.object({
    type: z.literal('daily-plan'),
    words: z.array(z.string().min(2).max(60)).min(1).max(20),
  }),
  z.object({ type: z.literal('checkpoint'), draft: sessionSchema }),
  z.object({ type: z.literal('discard-session'), kind: z.enum(['learn', 'review']) }),
  z.object({
    type: z.literal('capture'),
    id: z.uuid(),
    word: inputWordSchema,
    context: z.string().trim().max(2000),
  }),
  z.object({ type: z.literal('remove-capture'), id: z.uuid() }),
  z.object({
    type: z.literal('usage'),
    id: z.uuid(),
    words: z.array(z.string().min(2).max(60)).min(2).max(3),
    situation: z.string().min(1).max(120),
    text: z.string().trim().min(10).max(2000),
    reflection: z.enum(['ready', 'revisit']),
  }),
  z.object({ type: z.literal('remove-usage'), id: z.uuid() }),
] as const;
