import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import OpenAI from 'openai';
import { catalog } from '@/data/catalog';
import { failure } from '@/lib/http';
const { parse, options } = vi.hoisted(() => ({ parse: vi.fn(), options: vi.fn() }));
vi.mock('server-only', () => ({}));
vi.mock('openai', async (original) => {
  const actual = await original<typeof import('openai')>();
  class Client extends actual.default {
    constructor(config: ConstructorParameters<typeof actual.default>[0]) {
      super(config);
      options(config);
      this.responses.parse = parse;
    }
  }
  return { ...actual, default: Client };
});
import { openaiProvider } from '@/lib/ai/openai';
import { WordProviderError } from '@/lib/ai/errors';
beforeEach(() => {
  vi.stubEnv('OPENAI_API_KEY', 'unit-test-placeholder');
  vi.stubEnv('OPENAI_MODEL', '');
  vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => {
  vi.clearAllMocks();
  parse.mockReset();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});
it('uses the configured model, structured format, private input and bounded SDK options', async () => {
  vi.stubEnv('OPENAI_MODEL', 'gpt-5.6-terra');
  parse.mockResolvedValue({ output_parsed: catalog[0] });
  expect(await openaiProvider.generate('reluctant')).toEqual(catalog[0]);
  expect(options).toHaveBeenCalledWith({
    apiKey: 'unit-test-placeholder',
    timeout: 35000,
    maxRetries: 0,
  });
  expect(parse.mock.calls[0][0]).toMatchObject({
    model: 'gpt-5.6-terra',
    store: false,
    text: { format: { type: 'json_schema', strict: true } },
  });
  expect(parse.mock.calls[0][0].input[1].content).toBe(JSON.stringify({ word: 'reluctant' }));
});
it('keeps the fallback consistent and honors an explicit override', async () => {
  parse.mockResolvedValue({ output_parsed: catalog[0] });
  await openaiProvider.generate('reluctant');
  expect(parse.mock.calls[0][0].model).toBe('gpt-5.6-terra');
  vi.stubEnv('OPENAI_MODEL', 'project-model-override');
  await openaiProvider.generate('reluctant');
  expect(parse.mock.calls[1][0].model).toBe('project-model-override');
});
it('retries malformed structured output and validates the retry', async () => {
  parse
    .mockRejectedValueOnce(new SyntaxError('Malformed JSON'))
    .mockResolvedValueOnce({ output_parsed: catalog[0] });
  expect(await openaiProvider.generate('reluctant')).toEqual(catalog[0]);
  expect(parse).toHaveBeenCalledTimes(2);
});
it.each(['schema', 'answer', 'types', 'lemma'])('retries a %s validation failure', async (kind) => {
  const bad = structuredClone(catalog[0]);
  if (kind === 'answer') bad.exercises[0].answer = 3;
  if (kind === 'types') bad.exercises = Array(4).fill(bad.exercises[0]);
  if (kind === 'lemma') bad.word = '<invalid>';
  parse
    .mockResolvedValueOnce({ output_parsed: kind === 'schema' ? {} : bad })
    .mockResolvedValueOnce({ output_parsed: catalog[0] });
  expect(await openaiProvider.generate('reluctant')).toEqual(catalog[0]);
  expect(parse).toHaveBeenCalledTimes(2);
});
it('never saves incomplete content or silently falls back after two failures', async () => {
  parse.mockResolvedValue({ output_parsed: null });
  await expect(openaiProvider.generate('invalid')).rejects.toThrow('reliable lesson');
  expect(parse).toHaveBeenCalledTimes(2);
});
const apiError = (
  status: number,
  code: string | null = null,
  type: string | null = null,
  param: string | null = null,
) =>
  OpenAI.APIError.generate(
    status,
    { error: { message: 'PRIVATE provider details unit-test-placeholder', code, type, param } },
    undefined,
    new Headers(),
  );
it.each([
  ['authentication', () => apiError(401)],
  ['permission', () => apiError(403)],
  ['rate_limit', () => apiError(429, 'rate_limit_exceeded')],
  ['billing_quota', () => apiError(429, 'insufficient_quota')],
  ['billing_quota', () => apiError(429, null, 'insufficient_quota')],
  ['model_unavailable', () => apiError(404, 'model_not_found')],
  ['model_unavailable', () => apiError(400, null, null, 'model')],
  ['configuration', () => apiError(400, 'unsupported_parameter')],
  ['timeout', () => new OpenAI.APIConnectionTimeoutError()],
  ['network', () => new OpenAI.APIConnectionError({ message: 'PRIVATE network detail' })],
  ['upstream', () => apiError(500)],
  ['upstream', () => new Error('PRIVATE unexpected failure')],
] as const)(
  'classifies %s safely without retrying as bad lesson output',
  async (category, makeError) => {
    parse.mockRejectedValue(makeError());
    const error = await openaiProvider.generate('reluctant').catch((e) => e);
    expect(error).toBeInstanceOf(WordProviderError);
    expect(error.category).toBe(category);
    expect(parse).toHaveBeenCalledTimes(1);
    expect(await failure(error).json()).toEqual({
      error: 'AI word generation is temporarily unavailable. Please try again later.',
    });
    expect(console.error).toHaveBeenCalledWith('lexiloop.ai.unavailable', { category });
    expect(JSON.stringify(vi.mocked(console.error).mock.calls)).not.toMatch(
      /PRIVATE|unit-test-placeholder/,
    );
  },
);
it('handles a failed response object without retrying its billing error', async () => {
  parse.mockResolvedValue({ error: { code: 'insufficient_quota', message: 'PRIVATE' } });
  await expect(openaiProvider.generate('reluctant')).rejects.toMatchObject({
    category: 'billing_quota',
  });
  expect(parse).toHaveBeenCalledTimes(1);
});
it('fails safely before SDK creation if no API key is present', async () => {
  vi.stubEnv('OPENAI_API_KEY', '');
  await expect(openaiProvider.generate('reluctant')).rejects.toMatchObject({
    category: 'configuration',
  });
  expect(parse).not.toHaveBeenCalled();
});
