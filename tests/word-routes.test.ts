import { beforeEach, afterEach, it, expect, vi } from 'vitest';
import { catalog } from '@/data/catalog';
import { UserError } from '@/lib/errors';
const mocks = vi.hoisted(() => ({
  requireUser: vi.fn(),
  adminClient: vi.fn(),
  generate: vi.fn(),
  cacheWord: vi.fn(),
  rpc: vi.fn(),
  read: vi.fn(),
}));
vi.mock('@/lib/db/server', () => ({
  requireUser: mocks.requireUser,
  adminClient: mocks.adminClient,
}));
vi.mock('@/lib/db/state', () => ({ cacheWord: mocks.cacheWord }));
vi.mock('@/lib/ai/provider', () => ({ getProvider: async () => ({ generate: mocks.generate }) }));
import { POST } from '@/app/api/words/route';
const request = (word: string) =>
  new Request('https://lexiloop-ali.vercel.app/api/words', {
    method: 'POST',
    headers: { origin: 'https://lexiloop-ali.vercel.app' },
    body: JSON.stringify({ word, userId: 'attacker-chosen-id' }),
  });
beforeEach(() => {
  vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://lexiloop-ali.vercel.app');
  mocks.requireUser.mockResolvedValue({ user: { id: 'verified-user' } });
  mocks.read.mockResolvedValue({ data: null, error: null });
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: mocks.read,
  };
  mocks.adminClient.mockReturnValue({ from: vi.fn(() => chain), rpc: mocks.rpc });
  mocks.rpc.mockResolvedValue({ data: true, error: null });
  mocks.generate.mockResolvedValue({ ...catalog[0], word: 'unfathomable' });
  mocks.cacheWord.mockImplementation(async (word) => word);
});
afterEach(() => {
  vi.resetAllMocks();
  vi.unstubAllEnvs();
});
it('checks identity before starter content or privileged operations', async () => {
  mocks.requireUser.mockRejectedValue(new UserError('Please sign in to continue.'));
  expect((await POST(request('reluctant'))).status).toBe(401);
  expect(mocks.adminClient).not.toHaveBeenCalled();
  expect(mocks.generate).not.toHaveBeenCalled();
});
it('uses starter content without consuming generation quota', async () => {
  expect((await POST(request('RELUCTANT'))).status).toBe(200);
  expect(mocks.rpc).not.toHaveBeenCalled();
});
it('reuses a cached alias without a lease, quota or AI request', async () => {
  mocks.read
    .mockResolvedValueOnce({ data: { word: 'unfathomable' }, error: null })
    .mockResolvedValueOnce({ data: { content: catalog[0] }, error: null });
  expect((await POST(request('unfathomable'))).status).toBe(200);
  expect(mocks.rpc).not.toHaveBeenCalled();
  expect(mocks.generate).not.toHaveBeenCalled();
});
it('returns a retry response when another request owns the generation lease', async () => {
  mocks.rpc.mockResolvedValueOnce({ data: false, error: null });
  const response = await POST(request('unfathomable'));
  expect(response.status).toBe(409);
  expect(response.headers.get('retry-after')).toBe('10');
  expect(mocks.generate).not.toHaveBeenCalled();
});
it('rechecks the cache after claiming the lease', async () => {
  mocks.read
    .mockResolvedValueOnce({ data: null })
    .mockResolvedValueOnce({ data: null })
    .mockResolvedValueOnce({ data: null })
    .mockResolvedValueOnce({ data: { content: catalog[0] } });
  expect((await POST(request('unfathomable'))).status).toBe(200);
  expect(mocks.generate).not.toHaveBeenCalled();
  expect(mocks.rpc.mock.calls.map((c) => c[0])).toEqual([
    'claim_word_generation',
    'release_word_generation',
  ]);
});
it('charges only the verified user and returns persisted canonical content', async () => {
  mocks.cacheWord.mockResolvedValue(catalog[0]);
  const response = await POST(request('unfathomable'));
  expect(await response.json()).toEqual({ word: catalog[0], existing: false });
  expect(mocks.rpc).toHaveBeenCalledWith('consume_generation_quota', { p_user: 'verified-user' });
  expect(mocks.cacheWord).toHaveBeenCalledWith(
    expect.objectContaining({ word: 'unfathomable' }),
    'unfathomable',
  );
  expect(mocks.rpc).toHaveBeenCalledWith('release_word_generation', expect.anything());
});
it('stops at the application quota and releases the lease', async () => {
  mocks.rpc.mockImplementation(async (name) => ({
    data: name !== 'consume_generation_quota',
    error: null,
  }));
  const response = await POST(request('unfathomable'));
  expect((await response.json()).error).toContain('20 new word');
  expect(mocks.generate).not.toHaveBeenCalled();
  expect(mocks.rpc).toHaveBeenCalledWith('release_word_generation', expect.anything());
});
it('releases leases on provider failure without exposing raw error details', async () => {
  mocks.generate.mockRejectedValue(new Error('PRIVATE provider detail'));
  const response = await POST(request('unfathomable'));
  expect(JSON.stringify(await response.json())).not.toContain('PRIVATE');
  expect(mocks.cacheWord).not.toHaveBeenCalled();
  expect(mocks.rpc).toHaveBeenCalledWith('release_word_generation', expect.anything());
});
it('does not mislabel database quota failures as an exhausted allowance', async () => {
  mocks.rpc.mockImplementation(async (name) => ({
    data: true,
    error: name === 'consume_generation_quota' ? { message: 'PRIVATE database failure' } : null,
  }));
  const response = await POST(request('unfathomable'));
  expect((await response.json()).error).toContain('could not be checked');
  expect(mocks.generate).not.toHaveBeenCalled();
});
