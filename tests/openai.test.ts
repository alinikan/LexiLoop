import { afterEach, expect, it, vi } from 'vitest';
import { catalog } from '@/data/catalog';
const parse = vi.hoisted(() => vi.fn());
vi.mock('server-only', () => ({}));
vi.mock('openai', () => {
  class APIError extends Error {
    status = 401;
  }
  class Client {
    static APIError = APIError;
    responses = { parse };
  }
  return { default: Client };
});
import { openaiProvider } from '@/lib/ai/openai';
afterEach(() => parse.mockReset());
it('retries malformed structured output and validates the retry', async () => {
  parse
    .mockRejectedValueOnce(new SyntaxError('Malformed JSON'))
    .mockResolvedValueOnce({ output_parsed: catalog[0] });
  expect(await openaiProvider.generate('reluctant')).toEqual(catalog[0]);
  expect(parse).toHaveBeenCalledTimes(2);
  expect(parse.mock.calls[0][0].store).toBe(false);
  expect(parse.mock.calls[0][0].input[1].content).toBe(JSON.stringify({ word: 'reluctant' }));
});
it('never saves incomplete content or silently falls back after two failures', async () => {
  parse.mockResolvedValue({ output_parsed: { word: 'invalid' } });
  await expect(openaiProvider.generate('invalid')).rejects.toThrow('reliable lesson');
  expect(parse).toHaveBeenCalledTimes(2);
});
