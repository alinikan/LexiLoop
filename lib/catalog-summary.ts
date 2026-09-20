import type { Word } from './ai/schemas';

export type CatalogSummary = Pick<
  Word,
  'word' | 'partOfSpeech' | 'difficulty' | 'usefulness' | 'categories'
> & { definition: string };

export function summarizeWord(word: Word): CatalogSummary {
  return {
    word: word.word,
    partOfSpeech: word.partOfSpeech,
    difficulty: word.difficulty,
    usefulness: word.usefulness,
    categories: word.categories,
    definition: word.meanings[0].definition,
  };
}
