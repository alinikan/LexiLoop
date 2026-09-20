'use client';
import type { ReactNode } from 'react';
import { Today } from './today';
import { Discover } from './words/discover';
import { AddWord } from './words/add';
import { Collection } from './words/collection';
import { Learn } from './learning/learn';
import { Review } from './learning/review';
import { Progress } from './progress';
import { Settings } from './settings';
import { StoreProvider } from './store';
import { Shell } from './layout/shell';
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
  return <Page />;
}

export function AppFrame({ children }: { children: ReactNode }) {
  return (
    <StoreProvider>
      <Shell>
        <Reminder />
        {children}
      </Shell>
    </StoreProvider>
  );
}
