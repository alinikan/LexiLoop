import { notFound } from 'next/navigation';
import { AdminUsers } from '@/components/admin/users';
import { isAdminEmail } from '@/lib/admin';
import { requireUser } from '@/lib/db/server';

export default async function AdminPage() {
  const { user } = await requireUser();
  if (!isAdminEmail(user.email)) notFound();
  return <AdminUsers />;
}
