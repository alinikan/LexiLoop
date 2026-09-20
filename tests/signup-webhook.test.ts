import { beforeEach, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ send: vi.fn() }));
vi.mock('server-only', () => ({}));
vi.mock('@/lib/signup-notifications', () => ({ sendSignupNotification: mocks.send }));

import { POST } from '@/app/api/webhooks/signup/route';

const userId = '20000000-0000-4000-8000-000000000002';
const payload = {
  type: 'INSERT',
  table: 'signup_events',
  schema: 'public',
  record: { user_id: userId },
};

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv('SIGNUP_WEBHOOK_SECRET', 'a-secret-that-is-never-sent-to-the-browser');
  mocks.send.mockResolvedValue('sent');
});

it('rejects unsigned signup webhooks before reading account data', async () => {
  const response = await POST(
    new Request('https://lexiloop.test/api/webhooks/signup', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  );
  expect(response.status).toBe(401);
  expect(mocks.send).not.toHaveBeenCalled();
});

it('accepts the exact Supabase event and sends its queued notification', async () => {
  const response = await POST(
    new Request('https://lexiloop.test/api/webhooks/signup', {
      method: 'POST',
      headers: { Authorization: 'Bearer a-secret-that-is-never-sent-to-the-browser' },
      body: JSON.stringify(payload),
    }),
  );
  expect(await response.json()).toEqual({ ok: true, result: 'sent' });
  expect(mocks.send).toHaveBeenCalledWith(userId);
});
