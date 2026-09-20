import { afterEach, beforeEach, it, expect, vi } from 'vitest';
import { UserError } from '@/lib/errors';
const mocked = vi.hoisted(() => ({
  requireUser: vi.fn(),
  adminClient: vi.fn(),
  userClient: vi.fn(),
  redirect: vi.fn(),
}));
vi.mock('server-only', () => ({}));
vi.mock('@/lib/db/server', () => ({ ...mocked, configured: () => true }));
vi.mock('next/navigation', () => ({ redirect: mocked.redirect }));
import { GET as stateGET, POST as statePOST } from '@/app/api/state/route';
import { GET as exportGET } from '@/app/api/export/route';
import { protectPage } from '@/lib/auth';
beforeEach(() => {
  vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://lexiloop-ali.vercel.app');
  mocked.requireUser.mockRejectedValue(new UserError('Please sign in to continue.'));
});
afterEach(() => {
  vi.resetAllMocks();
  vi.unstubAllEnvs();
});
const request = (body: unknown) =>
  new Request('https://lexiloop-ali.vercel.app/api/state', {
    method: 'POST',
    headers: { origin: 'https://lexiloop-ali.vercel.app' },
    body: JSON.stringify(body),
  });
it('blocks unauthenticated state and export requests before privileged access', async () => {
  for (const result of [
    await stateGET(),
    await exportGET(),
    await statePOST(request({ version: 0, command: { type: 'start' } })),
  ]) {
    expect(result.status).toBe(401);
    expect(await result.json()).toEqual({ error: 'Please sign in to continue.' });
  }
  expect(mocked.adminClient).not.toHaveBeenCalled();
});
it('redirects a protected page without a verified Supabase user', async () => {
  mocked.userClient.mockResolvedValue({
    auth: { getUser: async () => ({ data: { user: null } }) },
  });
  await protectPage();
  expect(mocked.redirect).toHaveBeenCalledWith('/login');
});
