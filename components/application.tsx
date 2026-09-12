'use client';
import { Suspense } from 'react';
import dynamic from 'next/dynamic';
import { StoreProvider } from './store';
import { Shell } from './layout/shell';
import { Today } from './today';
const Discover = dynamic(() => import('./words/discover').then((module) => module.Discover), {
  loading: () => <p role="status">Opening your words…</p>,
});
const AddWord = dynamic(() => import('./words/add').then((module) => module.AddWord), {
  loading: () => <p role="status">Opening your words…</p>,
});
const Collection = dynamic(() => import('./words/collection').then((module) => module.Collection), {
  loading: () => <p role="status">Opening your words…</p>,
});
const Learn = dynamic(() => import('./learning/learn').then((module) => module.Learn), {
  loading: () => <p role="status">Opening your words…</p>,
});
const Review = dynamic(() => import('./learning/review').then((module) => module.Review), {
  loading: () => <p role="status">Opening your words…</p>,
});
const Progress = dynamic(() => import('./progress').then((module) => module.Progress), {
  loading: () => <p role="status">Opening your words…</p>,
});
const Settings = dynamic(() => import('./settings').then((module) => module.Settings), {
  loading: () => <p role="status">Opening your words…</p>,
});
import { Reminder } from './reminder';
const pages: Record<string, React.ComponentType> = {
  today: Today,
  suggested: Discover,
  add: AddWord,
  collection: Collection,
  learn: Learn,
  review: Review,
  progress: Progress,
  settings: Settings,
};
export function Application({ section = 'today' }: { section?: string }) {
  const Page = pages[section] || Today;
  return (
    <StoreProvider>
      <Shell>
        <Reminder />
        <Suspense fallback={<p>Opening your words…</p>}>
          <Page />
        </Suspense>
      </Shell>
    </StoreProvider>
  );
}
