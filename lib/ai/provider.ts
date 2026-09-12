import { UserError } from '@/lib/errors';
import 'server-only';
import type { Word } from './schemas';
export interface WordProvider {
  generate(word: string): Promise<Word>;
}
export async function getProvider(): Promise<WordProvider> {
  if (
    process.env.NODE_ENV !== 'production' &&
    process.env.MOCK_AI === 'true' &&
    process.env.AI_PROVIDER === 'mock'
  )
    return (await import('./mock')).mockProvider;
  if (
    process.env.AI_PROVIDER === 'openai' &&
    process.env.MOCK_AI !== 'true' &&
    process.env.OPENAI_API_KEY
  )
    return (await import('./openai')).openaiProvider;
  throw new UserError(
    'Word generation is not configured. Ask the app owner to configure an AI provider.',
  );
}
