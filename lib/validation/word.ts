import { z } from 'zod';
const aliases: Record<string, string> = {
  decisions: 'decision',
  decided: 'decide',
  deciding: 'decide',
  reinforces: 'reinforce',
  reinforced: 'reinforce',
  reinforcing: 'reinforce',
  overlooks: 'overlook',
  overlooked: 'overlook',
  overlooking: 'overlook',
};
export function normalizeWord(input: string) {
  const text = input.normalize('NFKC').trim().toLowerCase().replace(/\s+/g, ' ');
  return aliases[text] ?? text;
}
export const inputWordSchema = z
  .string()
  .max(80)
  .transform(normalizeWord)
  .pipe(
    z
      .string()
      .min(2, 'Enter at least two letters.')
      .max(60)
      .regex(
        /^[a-z]+(?:[ '-][a-z]+)*$/,
        'Enter an English word or short expression, using letters.',
      ),
  );
