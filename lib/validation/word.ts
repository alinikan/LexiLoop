import { z } from 'zod';
const aliases: Record<string, string> = {
  touche: 'touché',
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
export function comparableWord(input: string) {
  return input
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .replace(/[’‘]/g, "'")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}
export function normalizeWord(input: string) {
  const text = input
    .normalize('NFKC')
    .replace(/[’‘]/g, "'")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
  return aliases[comparableWord(text)] ?? text;
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
        /^\p{L}+(?:[ '-]\p{L}+)*$/u,
        'Enter an English word or short expression, using letters.',
      ),
  );

function editDistance(a: string, b: string) {
  const previous = [...Array(b.length + 1).keys()];
  for (let i = 1; i <= a.length; i++) {
    let diagonal = previous[0];
    previous[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const above = previous[j];
      previous[j] = Math.min(
        previous[j] + 1,
        previous[j - 1] + 1,
        diagonal + Number(a[i - 1] !== b[j - 1]),
      );
      diagonal = above;
    }
  }
  return previous[b.length];
}

export function suggestWord(input: string, candidates: string[]) {
  const needle = comparableWord(input);
  if (needle.length < 3) return null;
  const exact = candidates.find((candidate) => comparableWord(candidate) === needle);
  if (exact) return exact;
  const limit = needle.length <= 4 ? 1 : needle.length <= 8 ? 2 : 3;
  return (
    candidates
      .map((candidate) => ({
        candidate,
        distance: editDistance(needle, comparableWord(candidate)),
      }))
      .filter(({ distance, candidate }) => {
        const size = Math.max(needle.length, comparableWord(candidate).length);
        return distance <= limit && distance / size <= 0.34;
      })
      .toSorted((a, b) => a.distance - b.distance || a.candidate.localeCompare(b.candidate))[0]
      ?.candidate ?? null
  );
}
