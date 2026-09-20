import { AppFrame } from '@/components/application';
import { protectPage } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  await protectPage();
  return <AppFrame>{children}</AppFrame>;
}
