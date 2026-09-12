import { afterEach, beforeEach, expect, it, vi } from 'vitest';
const auth = vi.hoisted(() => ({
  signInWithPassword: vi.fn(),
  signUp: vi.fn(),
  signOut: vi.fn(),
  resetPasswordForEmail: vi.fn(),
  getUser: vi.fn(),
  updateUser: vi.fn(),
  exchangeCodeForSession: vi.fn(),
  verifyOtp: vi.fn(),
}));
vi.mock('@/lib/db/server', () => ({ userClient: async () => ({ auth }) }));
import { POST } from '@/app/api/auth/route';
import { GET } from '@/app/auth/confirm/route';
beforeEach(() => {
  vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://lexiloop.example');
  for (const fn of Object.values(auth)) fn.mockReset().mockResolvedValue({ error: null });
});
afterEach(() => vi.unstubAllEnvs());
const request = (body: unknown, origin = 'https://lexiloop.example') =>
  new Request('https://lexiloop.example/api/auth', {
    method: 'POST',
    headers: { origin, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
it('rejects cross-origin auth requests before calling Supabase', async () => {
  const response = await POST(request({ action: 'signout' }, 'https://attacker.example'));
  expect(response.status).toBe(400);
  expect(auth.signOut).not.toHaveBeenCalled();
});
it('keeps forgotten-password responses independent of account existence', async () => {
  const response = await POST(request({ action: 'forgot', email: 'someone@example.com' }));
  expect(response.status).toBe(200);
  expect((await response.json()).message).toContain('If this email has an account');
  expect(auth.resetPasswordForEmail).toHaveBeenCalledWith('someone@example.com', {
    redirectTo: 'https://lexiloop.example/auth/confirm?next=/reset-password',
  });
});
it('blocks unauthenticated password changes', async () => {
  auth.getUser.mockResolvedValue({ data: { user: null }, error: null });
  expect(
    (
      await POST(
        request({
          action: 'reset',
          password: 'new long passphrase',
          confirmPassword: 'new long passphrase',
        }),
      )
    ).status,
  ).toBe(401);
  expect(auth.updateUser).not.toHaveBeenCalled();
});
it('updates a verified account password and signs out sessions', async () => {
  auth.getUser.mockResolvedValue({ data: { user: { id: 'user-a' } }, error: null });
  expect(
    (
      await POST(
        request({
          action: 'reset',
          password: 'new long passphrase',
          confirmPassword: 'new long passphrase',
        }),
      )
    ).status,
  ).toBe(200);
  expect(auth.updateUser).toHaveBeenCalledWith({ password: 'new long passphrase' });
  expect(auth.signOut).toHaveBeenCalled();
});
it('uses a fixed internal recovery destination and never an attacker next URL', async () => {
  const response = await GET(
    new Request(
      'https://lexiloop.example/auth/confirm?token_hash=test&type=recovery&next=https://attacker.example',
    ),
  );
  expect(response.headers.get('location')).toBe('https://lexiloop.example/reset-password');
  expect(auth.verifyOtp).toHaveBeenCalledWith({ token_hash: 'test', type: 'recovery' });
});
it('turns expired confirmation links into useful token-free guidance', async () => {
  auth.exchangeCodeForSession.mockResolvedValue({
    error: { message: 'sensitive provider detail' },
  });
  const response = await GET(new Request('https://lexiloop.example/auth/confirm?code=secret-code'));
  expect(response.headers.get('location')).toBe(
    'https://lexiloop.example/login?confirmation=failed',
  );
});
it('does not expose unexpected upstream error details', async () => {
  auth.signInWithPassword.mockRejectedValue(new Error('secret-token-upstream-stack'));
  const response = await POST(
    request({ action: 'signin', email: 'person@example.com', password: 'password' }),
  );
  expect(JSON.stringify(await response.json())).not.toContain('secret-token');
});
