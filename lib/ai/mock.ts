import { catalog } from '@/data/catalog';
import type { WordProvider } from './provider';
export const mockProvider: WordProvider = {
  async generate(word) {
    const found = catalog.find((w) => w.word === word);
    if (!found)
      throw new Error(
        'Demo content is available for the 20 starter words. Try “reluctant”, “feasible”, or “clarify”. Live AI is required for other words.',
      );
    return found;
  },
};
