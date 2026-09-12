import { Application } from '@/components/application';
import { protectPage } from '@/lib/auth';
export const dynamic = 'force-dynamic';
export default async function Home() {
  await protectPage();
  return <Application />;
}
