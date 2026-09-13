import 'server-only';
import OpenAI from 'openai';
import { zodTextFormat } from 'openai/helpers/zod';
import { ZodError } from 'zod';
import { UserError } from '@/lib/errors';
import { inputWordSchema } from '@/lib/validation/word';
import { wordSchema, validateWord } from './schemas';
import { lexicalPrompt } from './prompts';
import { classifyProviderError, providerFailure, WordProviderError } from './errors';
import type { WordProvider } from './provider';

export const DEFAULT_OPENAI_MODEL = 'gpt-5.6-terra';
class InvalidLessonError extends Error {}

export const openaiProvider: WordProvider = {
  async generate(word) {
    if (!process.env.OPENAI_API_KEY?.trim()) throw providerFailure('configuration');
    const client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      timeout: 35000,
      maxRetries: 0,
    });
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const response = await client.responses.parse({
          model: process.env.OPENAI_MODEL?.trim() || DEFAULT_OPENAI_MODEL,
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
        if (response.error) {
          throw new OpenAI.APIError(undefined, response.error, undefined, undefined);
        }
        try {
          const lesson = validateWord(response.output_parsed);
          lesson.word = inputWordSchema.parse(lesson.word);
          return lesson;
        } catch {
          throw new InvalidLessonError();
        }
      } catch (error) {
        if (error instanceof WordProviderError) throw error;
        if (!(
          error instanceof SyntaxError ||
          error instanceof ZodError ||
          error instanceof InvalidLessonError
        ))
          throw providerFailure(classifyProviderError(error));
        if (attempt === 1)
          throw new UserError(
            'We couldn’t build a reliable lesson for this word. Check the spelling and try again.',
          );
      }
    }
    throw new UserError('Word generation failed.');
  },
};
