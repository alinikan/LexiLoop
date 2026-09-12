import { z } from 'zod';
export const exerciseSchema = z.object({
  type: z.enum(['meaning', 'context', 'distinction', 'application']),
  prompt: z.string().min(5).max(500),
  options: z.array(z.string().min(1).max(300)).min(2).max(4),
  answer: z.number().int().min(0).max(3),
  explanation: z.string().min(10).max(600),
});
export const wordSchema = z.object({
  word: z.string().min(1).max(60),
  pronunciation: z.string().max(100),
  partOfSpeech: z.string().min(1).max(60),
  difficulty: z.enum(['A2', 'B1', 'B2', 'C1']),
  usefulness: z.number().int().min(1).max(100),
  categories: z.array(z.string().max(40)).min(1).max(5),
  register: z.string().max(120),
  sensitive: z.boolean(),
  meanings: z
    .array(
      z.object({
        definition: z.string().min(10).max(400),
        simple: z.string().min(5).max(400),
        examples: z.array(z.string().min(10).max(400)).min(2).max(4),
      }),
    )
    .min(1)
    .max(3),
  scenario: z.string().min(10).max(600),
  whenToUse: z.string().min(5).max(400),
  commonMistake: z.string().min(5).max(400),
  synonyms: z
    .array(z.object({ word: z.string().max(60), distinction: z.string().min(5).max(400) }))
    .min(1)
    .max(4),
  antonyms: z.array(z.string().max(80)).max(5),
  family: z.array(z.string().max(80)).max(8),
  collocations: z.array(z.string().max(120)).min(1).max(5),
  patterns: z.array(z.string().max(150)).min(1).max(4),
  memoryHook: z.string().min(5).max(400),
  exercises: z.array(exerciseSchema).min(4).max(8),
});
export type Word = z.infer<typeof wordSchema>;
export function validateWord(value: unknown): Word {
  const word = wordSchema.parse(value);
  for (const exercise of word.exercises)
    if (exercise.answer >= exercise.options.length) throw new Error('Invalid exercise answer');
  for (const type of ['meaning', 'context', 'distinction', 'application'])
    if (!word.exercises.some((e) => e.type === type)) throw new Error('Missing exercise type');
  return word;
}
