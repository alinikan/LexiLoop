import { afterEach, expect, it, vi } from 'vitest';
import { authSchema } from '@/lib/validation/auth';
import { cambridgeEntrySchema } from '@/lib/dictionary/schema';
vi.mock('server-only', () => ({}));
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.resetModules();
});
it('disables demo and mock providers under production even with old flags', async () => {
  vi.stubEnv('NODE_ENV', 'production');
  vi.stubEnv('NEXT_PUBLIC_DEMO_MODE', 'true');
  vi.stubEnv('MOCK_AI', 'true');
  vi.stubEnv('AI_PROVIDER', 'mock');
  expect((await import('@/lib/config')).demoMode).toBe(false);
  await expect((await import('@/lib/ai/provider')).getProvider()).rejects.toThrow('not configured');
});
it('validates signup confirmation and allows existing shorter passwords at sign-in', () => {
  expect(
    authSchema.safeParse({
      action: 'signup',
      email: 'learner@example.com',
      password: 'long passphrase',
      confirmPassword: 'different',
    }).success,
  ).toBe(false);
  expect(
    authSchema.safeParse({ action: 'signin', email: 'learner@example.com', password: 'old-pass' })
      .success,
  ).toBe(true);
});
it('does not call Cambridge without licensed configuration', async () => {
  vi.stubEnv('CAMBRIDGE_LICENSE_CONFIRMED', 'false');
  const fetcher = vi.fn();
  vi.stubGlobal('fetch', fetcher);
  expect(
    (await (await import('@/lib/dictionary/cambridge')).cambridgeProvider.lookup('hello')).status,
  ).toBe('unconfigured');
  expect(fetcher).not.toHaveBeenCalled();
});
it.each([403, 404, 429, 500])(
  'handles Cambridge HTTP %i without leaking its error body or key',
  async (status) => {
    vi.stubEnv('CAMBRIDGE_LICENSE_CONFIRMED', 'true');
    vi.stubEnv('CAMBRIDGE_API_KEY', 'test-only-key');
    vi.stubEnv('CAMBRIDGE_DICTIONARY_CODE', 'test-dictionary');
    const fetcher = vi.fn().mockResolvedValue(new Response('private upstream error', { status }));
    vi.stubGlobal('fetch', fetcher);
    const result = await (
      await import('@/lib/dictionary/cambridge')
    ).cambridgeProvider.lookup('hello');
    expect(result.status).not.toBe('available');
    expect(JSON.stringify(result)).not.toMatch(/private upstream|test-only-key/);
    expect(fetcher.mock.calls[0][1].cache).toBe('no-store');
  },
);
it('rejects unsafe canonical dictionary links and malformed entries', () => {
  expect(cambridgeEntrySchema.safeParse({ entryUrl: 'javascript:alert(1)' }).success).toBe(false);
});
it('preserves Cambridge content verbatim and tolerates missing pronunciation', async () => {
  vi.stubEnv('CAMBRIDGE_LICENSE_CONFIRMED', 'true');
  vi.stubEnv('CAMBRIDGE_API_KEY', 'test-key');
  vi.stubEnv('CAMBRIDGE_DICTIONARY_CODE', 'test');
  vi.stubEnv('CAMBRIDGE_AUDIO_LICENSE_CONFIRMED', 'true');
  const entry = {
    dictionaryCode: 'test',
    entryId: 'test-entry',
    entryLabel: 'test',
    entryUrl: 'https://dictionary.cambridge.org/dictionary/english/test',
    format: 'html',
    entryContent: '<p>Fixture content, not a Cambridge definition.</p>',
  };
  vi.stubGlobal(
    'fetch',
    vi
      .fn()
      .mockResolvedValueOnce(Response.json(entry))
      .mockResolvedValueOnce(new Response('', { status: 404 })),
  );
  const result = await (
    await import('@/lib/dictionary/cambridge')
  ).cambridgeProvider.lookup('test');
  expect(result.status).toBe('available');
  if (result.status === 'available') {
    expect(result.entry.entryContent).toBe(entry.entryContent);
    expect(result.pronunciations).toEqual([]);
  }
});
