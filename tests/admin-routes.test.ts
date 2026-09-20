import { beforeEach, expect, it, vi } from 'vitest';
import { UserError } from '@/lib/errors';

const mocks = vi.hoisted(() => ({
  requireAdmin: vi.fn(),
  adminClient: vi.fn(),
  pending: vi.fn(),
  send: vi.fn(),
}));
vi.mock('server-only', () => ({}));
vi.mock('@/lib/admin', () => ({ requireAdmin: mocks.requireAdmin }));
vi.mock('@/lib/db/server', () => ({ adminClient: mocks.adminClient }));
vi.mock('@/lib/signup-notifications', () => ({
  pendingSignupNotifications: mocks.pending,
  sendSignupNotification: mocks.send,
}));

import { GET as listUsers } from '@/app/api/admin/users/route';
import { DELETE as deleteUser } from '@/app/api/admin/users/[id]/route';
import {
  GET as notificationQueue,
  POST as retryNotifications,
} from '@/app/api/admin/signup-notifications/route';

const adminId = '10000000-0000-4000-8000-000000000001';
const targetId = '20000000-0000-4000-8000-000000000002';

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://lexiloop.test');
  mocks.requireAdmin.mockResolvedValue({ user: { id: adminId, email: 'admin@example.com' } });
  mocks.pending.mockResolvedValue({ total: 1, events: [{ user_id: targetId }] });
  mocks.send.mockResolvedValue('sent');
});

it('lists only the account fields needed by the admin dashboard', async () => {
  mocks.adminClient.mockReturnValue({
    auth: {
      admin: {
        listUsers: vi.fn().mockResolvedValue({
          data: {
            users: [
              {
                id: targetId,
                email: 'learner@example.com',
                user_metadata: { display_name: 'Learner', private_note: 'do not return' },
                email_confirmed_at: '2026-09-19T00:00:00Z',
                created_at: '2026-09-18T00:00:00Z',
                last_sign_in_at: null,
              },
            ],
            nextPage: null,
            lastPage: 1,
            total: 1,
          },
          error: null,
        }),
      },
    },
  });
  const response = await listUsers(new Request('https://lexiloop.test/api/admin/users?page=1'));
  const body = await response.json();
  expect(body.total).toBe(1);
  expect(body.users[0]).toEqual(expect.objectContaining({ email: 'learner@example.com' }));
  expect(JSON.stringify(body)).not.toContain('private_note');
});

it('requires administrator access and prevents self-deletion', async () => {
  mocks.requireAdmin.mockRejectedValueOnce(new UserError('Administrator access is required.'));
  expect((await listUsers(new Request('https://lexiloop.test/api/admin/users'))).status).toBe(400);
  const response = await deleteUser(
    new Request(`https://lexiloop.test/api/admin/users/${adminId}`, {
      method: 'DELETE',
      headers: { origin: 'https://lexiloop.test' },
      body: JSON.stringify({ email: 'admin@example.com' }),
    }),
    { params: Promise.resolve({ id: adminId }) },
  );
  expect((await response.json()).error).toContain('cannot delete');
});

it('deletes a different account only after exact email confirmation', async () => {
  const getUserById = vi.fn().mockResolvedValue({
    data: { user: { id: targetId, email: 'learner@example.com' } },
    error: null,
  });
  const remove = vi.fn().mockResolvedValue({ error: null });
  mocks.adminClient.mockReturnValue({ auth: { admin: { getUserById, deleteUser: remove } } });
  const response = await deleteUser(
    new Request(`https://lexiloop.test/api/admin/users/${targetId}`, {
      method: 'DELETE',
      headers: { origin: 'https://lexiloop.test' },
      body: JSON.stringify({ email: 'learner@example.com' }),
    }),
    { params: Promise.resolve({ id: targetId }) },
  );
  expect(response.status).toBe(200);
  expect(remove).toHaveBeenCalledWith(targetId);
});

it('shows and retries the durable signup notification queue', async () => {
  expect((await notificationQueue()).status).toBe(200);
  const response = await retryNotifications(
    new Request('https://lexiloop.test/api/admin/signup-notifications', {
      method: 'POST',
      headers: { origin: 'https://lexiloop.test' },
    }),
  );
  expect(await response.json()).toEqual({ sent: 1, failed: 0, remaining: 0 });
  expect(mocks.send).toHaveBeenCalledWith(targetId);
});
