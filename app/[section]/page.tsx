import { notFound } from 'next/navigation';
import { Application } from '@/components/application';
import { protectPage } from '@/lib/auth';
export const dynamic = 'force-dynamic';
export default async function Page({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  if (
    !['suggested', 'add', 'collection', 'learn', 'review', 'progress', 'settings'].includes(section)
  )
    notFound();
  await protectPage();
  return <Application section={section} />;
}
