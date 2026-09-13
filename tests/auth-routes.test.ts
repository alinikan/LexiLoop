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

it('registers a valid account and requests confirmation at the configured production origin', async () => {
  vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://lexiloop-ali.vercel.app');
  const response = await POST(
    request(
      {
        action: 'signup',
        email: 'learner@example.com',
        password: 'long test passphrase',
        confirmPassword: 'long test passphrase',
        displayName: 'Learner',
      },
      'https://lexiloop-ali.vercel.app',
    ),
  );
  expect(await response.json()).toEqual({ ok: true, confirmation: true });
  expect(auth.signUp).toHaveBeenCalledWith({
    email: 'learner@example.com',
    password: 'long test passphrase',
    options: {
      emailRedirectTo: 'https://lexiloop-ali.vercel.app/auth/confirm',
      data: { display_name: 'Learner' },
    },
  });
});
it.each([
  { email: 'invalid', password: 'long test passphrase', confirmPassword: 'long test passphrase' },
  { email: 'learner@example.com', password: 'short', confirmPassword: 'short' },
  { email: 'learner@example.com', password: 'long test passphrase', confirmPassword: 'different' },
])('rejects invalid signup before contacting Supabase', async (fields) => {
  expect((await POST(request({ action: 'signup', ...fields }))).status).toBe(400);
  expect(auth.signUp).not.toHaveBeenCalled();
});
it('handles duplicate signup without exposing account/provider details', async () => {
  auth.signUp.mockResolvedValue({ error: { message: 'PRIVATE duplicate account detail' } });
  const response = await POST(
    request({
      action: 'signup',
      email: 'learner@example.com',
      password: 'long test passphrase',
      confirmPassword: 'long test passphrase',
    }),
  );
  expect(response.status).toBe(400);
  expect((await response.json()).error).toContain('password recovery');
});
it.each(['invalid_credentials', 'email_not_confirmed'])(
  'handles %s with the same safe sign-in guidance',
  async (code) => {
    auth.signInWithPassword.mockResolvedValue({ error: { code, message: 'PRIVATE' } });
    const response = await POST(
      request({ action: 'signin', email: 'learner@example.com', password: 'password' }),
    );
    expect((await response.json()).error).toContain('confirm your email');
  },
);
it('accepts sign-in and sign-out and marks auth responses uncached', async () => {
  for (const body of [
    { action: 'signin', email: 'learner@example.com', password: 'password' },
    { action: 'signout' },
  ]) {
    const response = await POST(request(body));
    expect(await response.json()).toEqual({ ok: true });
    expect(response.headers.get('cache-control')).toBe('no-store');
  }
});
it('accepts email confirmation and PKCE recovery while ignoring unsafe next paths', async () => {
  expect(
    (
      await GET(
        new Request(
          'https://lexiloop.example/auth/confirm?token_hash=fixture&type=email&next=//attacker.example',
        ),
      )
    ).headers.get('location'),
  ).toBe('https://lexiloop.example/');
  expect(
    (
      await GET(
        new Request('https://lexiloop.example/auth/confirm?code=fixture&next=/reset-password'),
      )
    ).headers.get('location'),
  ).toBe('https://lexiloop.example/reset-password');
});
it.each(['', '?token_hash=fixture&type=invalid', '?token_hash=expired&type=recovery'])(
  'rejects invalid callback %s',
  async (query) => {
    auth.verifyOtp.mockResolvedValue({ error: { message: 'PRIVATE' } });
    expect(
      (await GET(new Request(`https://lexiloop.example/auth/confirm${query}`))).headers.get(
        'location',
      ),
    ).toBe('https://lexiloop.example/login?confirmation=failed');
  },
);
it('rejects missing and lookalike origins in production', async () => {
  vi.stubEnv('NODE_ENV', 'production');
  for (const origin of ['', 'https://lexiloop.example.attacker.test'])
    expect((await POST(request({ action: 'signout' }, origin))).status).toBe(400);
  expect(auth.signOut).not.toHaveBeenCalled();
});
