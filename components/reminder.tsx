'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useStore } from './store';
import { todaySet } from '@/lib/domain';
export function Reminder() {
  const { state } = useStore();
  const [now, setNow] = useState(() => new Date()),
    [dismissed, setDismissed] = useState('');
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);
  const today = todaySet(state, now);
  const time = new Intl.DateTimeFormat('en-GB', {
    timeZone: state.settings.timezone,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(now);
  if (
    !state.settings.reminder ||
    time < state.settings.reminderTime ||
    today.completed.length >= today.goal ||
    dismissed === today.date
  )
    return null;
  return (
    <div className="reminder-banner" role="status">
      <span>A little room for your words? Your daily practice is ready.</span>
      <Link href="/learn">Let’s practice</Link>
      <button onClick={() => setDismissed(today.date)} aria-label="Dismiss reminder">
        ×
      </button>
    </div>
  );
}
