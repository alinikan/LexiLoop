'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home,
  Sparkles,
  RotateCcw,
  Library,
  ChartNoAxesColumnIncreasing,
  Settings,
  Plus,
  Flame,
  ArrowUpRight,
  AudioLines,
} from 'lucide-react';
import { appConfig, demoMode } from '@/lib/config';
import { useStore } from '../store';
import { metrics, dueWords } from '@/lib/domain';
import type { ReactNode } from 'react';
const nav = [
  { href: '/', name: 'Today', icon: Home },
  { href: '/suggested', name: 'Discover', icon: Sparkles },
  { href: '/review', name: 'Review', icon: RotateCcw },
  { href: '/collection', name: 'My words', icon: Library },
  { href: '/progress', name: 'Progress', icon: ChartNoAxesColumnIncreasing },
];
export function Shell({ children }: { children: ReactNode }) {
  const path = usePathname(),
    { state, ready, error, message, offline, reload } = useStore();
  const stats = metrics(state);
  return (
    <div className="app-shell">
      <a className="skip" href="#main">
        Skip to content
      </a>
      <aside className="sidebar">
        <Link className="brand" href="/">
          <span className="brand-mark">
            <AudioLines size={23} />
          </span>
          {appConfig.name}
          <span className="brand-dot">.</span>
        </Link>
        <span className="nav-caption">YOUR DAILY PRACTICE</span>
        <nav aria-label="Main navigation">
          {nav.map(({ href, name, icon: Icon }) => (
            <Link key={href} href={href} className={path === href ? 'nav-link active' : 'nav-link'}>
              <Icon size={21} />
              <span>{name}</span>
              {href === '/review' && dueWords(state).length > 0 && (
                <span className="nav-count">{dueWords(state).length}</span>
              )}
            </Link>
          ))}
        </nav>
        <Link href="/add" className="button add-nav">
          <Plus size={19} /> Add a word
        </Link>
        <div className="sidebar-bottom">
          <div className="small-note">
            <span className="eyebrow">A LITTLE, EVERY DAY</span>
            <p>
              Your next conversation
              <br />
              starts with a new word.
            </p>
            <span className="tiny">{appConfig.tagline}</span>
          </div>
          <Link href="/settings" className={'nav-link ' + (path === '/settings' ? 'active' : '')}>
            <Settings size={20} /> Settings
          </Link>
          <Link href="/install" className="install-link">
            Take your words with you <ArrowUpRight size={16} />
          </Link>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <Link href="/" className="mobile-brand">
            {appConfig.name}
            <span>.</span>
          </Link>
          <span className="topbar-label">
            {state.settings.displayName
              ? `Welcome back, ${state.settings.displayName}.`
              : 'Make room for a few new words.'}
          </span>
          <div className="topbar-stats">
            {demoMode && <span className="demo-badge">Device demo</span>}
            <span className="streak-pill">
              <Flame size={17} />
              {stats.streak}
              <span className="desktop-only"> day streak</span>
            </span>
            <Link href="/settings" className="avatar" aria-label="Open settings">
              {(state.settings.displayName || 'L').slice(0, 1).toUpperCase()}
            </Link>
          </div>
        </header>
        <main id="main">
          {offline && (
            <div className="notice">
              You’re offline.{' '}
              {demoMode
                ? 'Your demo progress stays on this device.'
                : 'Loaded words are available to read. Reconnect to save progress.'}
            </div>
          )}
          {error && (
            <div className="error-banner" role="alert">
              {error}
              <button onClick={reload}>Reload collection</button>
            </div>
          )}
          {ready
            ? children
            : !error && (
                <div className="loading">
                  <span className="spinner" /> Opening your wordbook…
                </div>
              )}
        </main>
        <footer className="page-footer">
          A little practice goes a long way.<Link href="/privacy">Privacy & data</Link>
        </footer>
      </div>
      <nav className="bottom-nav" aria-label="Mobile navigation">
        {nav.slice(0, 4).map(({ href, name, icon: Icon }) => (
          <Link key={href} href={href} className={path === href ? 'active' : ''}>
            <Icon size={21} />
            <span>{name}</span>
          </Link>
        ))}
        <Link href="/settings" className={path === '/settings' ? 'active' : ''}>
          <Settings size={21} />
          <span>More</span>
        </Link>
      </nav>
      {message && (
        <div className="toast" role="status">
          {message}
        </div>
      )}
    </div>
  );
}
