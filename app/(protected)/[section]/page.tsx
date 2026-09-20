import { notFound } from 'next/navigation';
import { Application } from '@/components/application';

export default async function Page({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  if (
    !['suggested', 'add', 'collection', 'learn', 'review', 'progress', 'settings'].includes(section)
  )
    notFound();
  return <Application section={section} />;
}
