import type { Word } from './ai/schemas';
/** Add new library entries without replacing a learner's previously saved teaching content. */
export function mergeCatalog(library: Word[], stored: Word[]): Word[] {
  const existing = new Map(stored.map((word) => [word.word, word]));
  const names = new Set(library.map((word) => word.word));
  return [
    ...library.map((word) => existing.get(word.word) ?? word),
    ...stored.filter((word) => !names.has(word.word)),
  ];
}
