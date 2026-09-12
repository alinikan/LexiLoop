import { redirect } from 'next/navigation';
import { demoMode } from './config';
import { configured, userClient } from './db/server';
export async function protectPage() {
  if (demoMode) return;
  if (!configured()) redirect('/login');
  const db = await userClient();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) redirect('/login');
}
