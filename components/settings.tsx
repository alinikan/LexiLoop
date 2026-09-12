'use client';
import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { Bell, Download, ArrowRight, Check, LogOut, Smartphone } from 'lucide-react';
import { useStore } from './store';
import { demoMode } from '@/lib/config';
import { settingsSchema } from '@/lib/validation/commands';
export function Onboarding() {
  const { state, dispatch, busy } = useStore();
  const [goal, setGoal] = useState(5);
  const [preferences, setPreferences] = useState(state.settings);
  return (
    <section className="onboarding">
      <div>
        <span className="eyebrow">WELCOME TO YOUR DAILY LOOP</span>
        <h2>Start small. Make it a habit.</h2>
        <p>Choose your daily goal. A small, steady practice is a great place to start.</p>
        <details className="onboarding-details">
          <summary>Personalize your practice (optional)</summary>
          <label>
            Vocabulary level
            <select
              value={preferences.level}
              onChange={(e) =>
                setPreferences({
                  ...preferences,
                  level: e.target.value as typeof preferences.level,
                })
              }
            >
              <option value="A2">A2 · Basics</option>
              <option value="B1">B1 · Everyday confidence</option>
              <option value="B2">B2 · More nuance</option>
              <option value="C1">C1 · Advanced</option>
            </select>
          </label>
          <fieldset>
            <legend>Areas of interest</legend>
            <div className="interest-checks">
              {['Everyday', 'Workplace', 'Academic', 'Reading', 'Conversation'].map((c) => (
                <label className="check-label" key={c}>
                  <input
                    type="checkbox"
                    checked={preferences.interests.includes(c)}
                    onChange={(e) =>
                      setPreferences({
                        ...preferences,
                        interests: e.target.checked
                          ? [...preferences.interests, c]
                          : preferences.interests.filter((i) => i !== c),
                      })
                    }
                  />
                  {c}
                </label>
              ))}
            </div>
          </fieldset>
          <label className="check-label">
            <input
              type="checkbox"
              checked={preferences.reminder}
              onChange={(e) => setPreferences({ ...preferences, reminder: e.target.checked })}
            />
            Remind me inside the app each day
          </label>
          <p>
            You can change the reminder time in Settings and add your first personal words from
            Today.
          </p>
        </details>
      </div>
      <label>
        Words a day
        <select value={goal} onChange={(e) => setGoal(Number(e.target.value))}>
          {[1, 3, 5, 7, 10].map((n) => (
            <option key={n} value={n}>
              {n} words
            </option>
          ))}
        </select>
      </label>
      <button
        className="button"
        disabled={busy}
        onClick={() =>
          void dispatch({
            type: 'settings',
            settings: {
              ...preferences,
              goal,
              timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
              onboarded: true,
            },
          })
        }
      >
        Let’s begin
        <ArrowRight size={17} />
      </button>
      <button
        className="text-link"
        disabled={busy}
        onClick={() =>
          void dispatch({
            type: 'settings',
            settings: {
              ...state.settings,
              timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
              onboarded: true,
            },
          })
        }
      >
        Skip
      </button>
    </section>
  );
}
export function Settings() {
  const { state, catalog, dispatch, busy, notify } = useStore();
  const [settings, setSettings] = useState(state.settings),
    [error, setError] = useState(''),
    [permission, setPermission] = useState('');
  async function save(e: FormEvent) {
    e.preventDefault();
    const parsed = settingsSchema.safeParse(settings);
    if (!parsed.success) {
      setError(parsed.error.issues[0].message);
      return;
    }
    setError('');
    if (await dispatch({ type: 'settings', settings: parsed.data }))
      notify('Your settings are saved.');
  }
  function exportWords() {
    if (!demoMode) {
      const download = document.createElement('a');
      download.href = '/api/export';
      download.download = 'lexiloop-wordbook.json';
      download.click();
      return;
    }
    const blob = new Blob(
      [
        JSON.stringify(
          {
            exportedAt: new Date().toISOString(),
            state,
            lexicalContent: catalog.filter((w) => state.words.some((s) => s.word === w.word)),
          },
          null,
          2,
        ),
      ],
      { type: 'application/json' },
    );
    const url = URL.createObjectURL(blob),
      a = document.createElement('a');
    a.href = url;
    a.download = 'lexiloop-wordbook.json';
    a.click();
    URL.revokeObjectURL(url);
  }
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">YOUR LOOP, YOUR PACE</p>
          <h1>Make yourself at home.</h1>
          <p>A routine that fits your life is one you’ll keep.</p>
        </div>
      </div>
      <div className="settings-layout">
        <form onSubmit={save} className="panel settings-form">
          <h2>Your practice</h2>
          <label>
            Display name (optional)
            <input
              maxLength={60}
              autoComplete="nickname"
              value={settings.displayName ?? ''}
              onChange={(e) => setSettings({ ...settings, displayName: e.target.value })}
            />
          </label>
          <label className="check-label">
            <input
              type="checkbox"
              checked={settings.reducedMotion ?? false}
              onChange={(e) => setSettings({ ...settings, reducedMotion: e.target.checked })}
            />{' '}
            Reduce motion
          </label>
          <label>
            Daily word goal
            <input
              type="number"
              min={1}
              max={20}
              value={settings.goal}
              onChange={(e) => setSettings({ ...settings, goal: Number(e.target.value) })}
            />
            <small>If today’s lesson has started, this changes tomorrow’s goal.</small>
          </label>
          <label>
            Vocabulary level
            <select
              value={settings.level}
              onChange={(e) =>
                setSettings({ ...settings, level: e.target.value as typeof settings.level })
              }
            >
              <option value="A2">A2 · Building the basics</option>
              <option value="B1">B1 · Everyday confidence</option>
              <option value="B2">B2 · More nuance</option>
              <option value="C1">C1 · Advanced but useful</option>
            </select>
          </label>
          <fieldset>
            <legend>Words for your world</legend>
            <div className="interest-checks">
              {['Everyday', 'Workplace', 'Academic', 'Reading', 'Conversation'].map((c) => (
                <label className="check-label" key={c}>
                  <input
                    type="checkbox"
                    checked={settings.interests.includes(c)}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        interests: e.target.checked
                          ? [...settings.interests, c]
                          : settings.interests.filter((i) => i !== c),
                      })
                    }
                  />
                  {c}
                </label>
              ))}
            </div>
          </fieldset>
          <hr />
          <h2>
            <Bell size={21} /> A gentle nudge
          </h2>
          <label className="check-label">
            <input
              type="checkbox"
              checked={settings.reminder}
              onChange={(e) => setSettings({ ...settings, reminder: e.target.checked })}
            />{' '}
            Show an in-app daily reminder
          </label>
          <label>
            Preferred time
            <input
              type="time"
              value={settings.reminderTime}
              onChange={(e) => setSettings({ ...settings, reminderTime: e.target.value })}
            />
          </label>
          <label>
            Timezone
            <input
              value={settings.timezone}
              onChange={(e) => setSettings({ ...settings, timezone: e.target.value })}
              list="timezones"
            />
            <datalist id="timezones">
              {[
                'UTC',
                'America/Vancouver',
                'America/New_York',
                'Europe/London',
                'Europe/Paris',
                'Asia/Kolkata',
                'Asia/Tokyo',
                'Australia/Sydney',
              ].map((t) => (
                <option key={t} value={t} />
              ))}
            </datalist>
          </label>
          <p className="tiny">
            Reminders appear while the app is open or when you return after your preferred time.
            This version does not send scheduled background push notifications.
          </p>
          <button
            type="button"
            className="button secondary"
            onClick={async () => {
              if (!('Notification' in window)) {
                setPermission(
                  'This browser does not support notifications here. Use the in-app reminder.',
                );
                return;
              }
              try {
                const result = await Notification.requestPermission();
                setPermission(
                  result === 'granted'
                    ? 'Permission granted. This is an immediate test, not a scheduled reminder.'
                    : `Notifications ${result}. In-app reminders still work.`,
                );
                if (result === 'granted' && 'serviceWorker' in navigator) {
                  const registration = await navigator.serviceWorker.ready;
                  await registration.showNotification('Your daily loop', {
                    body: 'A little vocabulary practice goes a long way.',
                    icon: '/icon-192.png',
                  });
                }
              } catch {
                setPermission(
                  'Notification test is not available in this browser. In-app reminders still work.',
                );
              }
            }}
          >
            Test notification permission
          </button>
          {permission && <p role="status">{permission}</p>}
          <hr />
          <label className="check-label">
            <input
              type="checkbox"
              checked={settings.dark}
              onChange={(e) => setSettings({ ...settings, dark: e.target.checked })}
            />{' '}
            Dark appearance
          </label>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <button className="button" disabled={busy}>
            Save settings
            <Check size={18} />
          </button>
        </form>
        <aside className="settings-aside">
          <div className="panel">
            <Smartphone size={27} />
            <h3>Your words, on your Home Screen.</h3>
            <p>Open your daily practice in one tap.</p>
            <Link href="/install" className="text-link">
              Install LexiLoop
              <ArrowRight size={16} />
            </Link>
          </div>
          <div className="panel">
            <h3>Your data belongs to you.</h3>
            <p>Export your words, notes, and practice history as a JSON file.</p>
            <button className="button secondary" onClick={exportWords}>
              <Download size={17} /> Export wordbook
            </button>
            <p className="tiny">
              {demoMode
                ? 'Demo data is stored only in this browser. Clearing site data removes it.'
                : 'Your collection is private to your account. For account deletion, contact the app operator.'}
            </p>
          </div>
          <div className="panel">
            <h3>Keep exploring</h3>
            <Link className="nav-link" href="/progress">
              Your progress
              <ArrowRight size={17} />
            </Link>
            <Link className="nav-link" href="/privacy">
              Privacy & data
              <ArrowRight size={17} />
            </Link>
            {!demoMode && (
              <button
                className="button secondary"
                onClick={async () => {
                  const response = await fetch('/api/auth', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'signout' }),
                  });
                  if (!response.ok) {
                    notify('Sign-out failed. Please try again.');
                    return;
                  }
                  localStorage.setItem('lexiloop-auth-change', String(Date.now()));
                  window.location.replace('/login');
                }}
              >
                <LogOut size={17} />
                Sign out
              </button>
            )}
            {demoMode && (
              <Link href="/login" className="text-link">
                About demo & accounts
              </Link>
            )}
          </div>
        </aside>
      </div>
    </>
  );
}
