import { afterEach, expect, it, vi } from 'vitest';
import { authSchema } from '@/lib/validation/auth';
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
