import 'server-only';
import { UserError } from './errors';
import { requireUser } from './db/server';

export function isAdminEmail(email?: string | null) {
  if (!email) return false;
  return (process.env.ADMIN_EMAILS ?? '')
    .split(',')
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean)
    .includes(email.toLowerCase());
}

export async function requireAdmin() {
  const session = await requireUser();
  if (!isAdminEmail(session.user.email)) throw new UserError('Administrator access is required.');
  return session;
}
