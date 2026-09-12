import { redirect } from 'next/navigation';
import { PasswordForm } from '@/components/auth/password-form';
import { requireUser } from '@/lib/db/server';
export const dynamic = 'force-dynamic';
export default async function Page() {
  try {
    await requireUser();
  } catch {
    redirect('/login?confirmation=failed');
  }
  return <PasswordForm reset />;
}
