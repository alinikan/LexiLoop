import { UserError } from '@/lib/errors';
import 'server-only';
import OpenAI from 'openai';
import { zodTextFormat } from 'openai/helpers/zod';
import { wordSchema, validateWord } from './schemas';
import { lexicalPrompt } from './prompts';
import type { WordProvider } from './provider';
export const openaiProvider: WordProvider = {
  async generate(word) {
    const client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      timeout: 35000,
      maxRetries: 0,
    });
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const response = await client.responses.parse({
          model: process.env.OPENAI_MODEL || 'gpt-4.1-mini',
          store: false,
          input: [
            {
              role: 'system',
              content:
                lexicalPrompt +
                (attempt
                  ? ' Double-check answer indices and all four required exercise types.'
                  : ''),
            },
            { role: 'user', content: JSON.stringify({ word }) },
          ],
          text: { format: zodTextFormat(wordSchema, 'word_lesson') },
        });
        return validateWord(response.output_parsed);
      } catch (error) {
        if (error instanceof OpenAI.APIError && [401, 403, 429].includes(error.status ?? 0))
          throw new UserError(
            'Word generation is temporarily unavailable. Please try again later.',
          );
        if (attempt === 1)
          throw new UserError(
            'We couldn’t build a reliable lesson for this word. Check the spelling and try again.',
          );
      }
    }
    throw new UserError('Word generation failed.');
  },
};
