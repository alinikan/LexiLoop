'use client';
import Link from 'next/link';
import {
  ArrowRight,
  Plus,
  Check,
  RotateCcw,
  ArrowUpRight,
  Target,
  Sparkles,
  BookOpen,
  X,
} from 'lucide-react';
import { useStore } from './store';
import { todaySet, dueWords, metrics } from '@/lib/domain';
import { DailyPlan } from './daily-plan';
import { CaptureInbox, UseTogether } from './vocabulary-tools';
import { workspace } from '@/lib/practice';
import { Onboarding } from './settings';
export function Today() {
  const { state, catalog, dispatch, busy } = useStore();
  const today = todaySet(state),
    stats = metrics(state),
    due = dueWords(state);
  const complete = today.completed.length === today.goal;
  const date = new Intl.DateTimeFormat('en', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    timeZone: state.settings.timezone,
  }).format(new Date());
  return (
    <>
      {!state.settings.onboarded && <Onboarding />}
      <div className="page-heading">
        <div>
          <p className="eyebrow">{date}</p>
          <h1>
            A few words.
            <br className="mobile-only" /> A little more you.
          </h1>
          <p>Build your vocabulary. Find your voice.</p>
        </div>
        <span className="heading-glyph" aria-hidden="true">
          Aa<span>+</span>
        </span>
      </div>
      <div className="home-grid">
        <section className="daily-hero">
          <div className="hero-copy">
            <span className="hero-label">
              <span className="mini-dot" /> YOUR DAILY LOOP
            </span>
            <h2>
              {complete ? (
                <>
                  You made
                  <br />
                  them yours.
                </>
              ) : (
                <>
                  Small practice.
                  <br />
                  Lasting words.
                </>
              )}
            </h2>
            <p>
              {complete
                ? 'Your words are saved. We’ll bring them back when it’s time to review.'
                : `${today.goal} useful words. Real-life examples. A little practice that stays with you.`}
            </p>
            <Link
              href={
                complete ? '/review' : today.words.length === today.goal ? '/learn' : '/suggested'
              }
              className="button lime"
            >
              {complete
                ? 'Keep the loop going'
                : today.started
                  ? 'Continue lesson'
                  : today.words.length === today.goal
                    ? 'Start today’s lesson'
                    : 'Choose today’s words'}
              <ArrowRight size={20} />
            </Link>
            <span className="hero-foot">
              {complete
                ? 'Daily goal complete — nicely done.'
                : `${today.goal * 3}–${today.goal * 4} min · At your own pace`}
            </span>
          </div>
          <div
            className="loop-visual"
            role="img"
            aria-label={`${today.completed.length} of ${today.goal} words completed`}
          >
            <svg viewBox="0 0 220 220">
              <circle
                cx="110"
                cy="110"
                r="87"
                fill="none"
                stroke="rgba(255,255,255,.16)"
                strokeWidth="12"
              />
              <circle
                cx="110"
                cy="110"
                r="87"
                fill="none"
                stroke="#d8fa6b"
                strokeWidth="12"
                strokeLinecap="round"
                strokeDasharray={`${(today.completed.length / today.goal) * 547} 547`}
                transform="rotate(-90 110 110)"
              />
            </svg>
            <div>
              <span>
                {today.completed.length}
                <i>/{today.goal}</i>
              </span>
              <small>words completed</small>
            </div>
            <span className="loop-spark">✦</span>
          </div>
        </section>
        <aside className="review-card">
          <div className="review-icon">
            <RotateCcw size={24} />
          </div>
          <span className="eyebrow">MAKE IT STICK</span>
          <h2>{due.length ? `${due.length} words ready` : 'A fresh start'}</h2>
          <p>
            {due.length
              ? 'A familiar word today. A confident conversation tomorrow.'
              : 'Your learned words will return here, just when you need them.'}
          </p>
          <Link href="/review" className="button secondary">
            {due.length ? 'Start a quick review' : 'Explore review'}
            <ArrowUpRight size={18} />
          </Link>
          <span className="tiny">
            {due.length
              ? `About ${Math.ceil(Math.min(5, due.length) * 0.7)} minutes`
              : 'Spaced for lasting memory'}
          </span>
        </aside>
      </div>
      <DailyPlan key={today.date} />
      {workspace(state).sessions.learn && (
        <p className="notice">
          <Link href="/learn">Your saved lesson is waiting. Resume where you left off →</Link>
        </p>
      )}
      <section className="today-words">
        <div className="section-heading">
          <div>
            <h2>
              Today’s wordlist{' '}
              <span className="count-badge">
                {today.words.length} / {today.goal}
              </span>
            </h2>
            <p>
              {today.started
                ? 'Your learning set is ready. Let’s make it memorable.'
                : `${today.goal - today.words.length} ${today.goal - today.words.length === 1 ? 'slot' : 'slots'} remaining. A mix of your words and new discoveries.`}
            </p>
          </div>
          <Link href="/add" className="text-link">
            <Plus size={17} /> Add your own
          </Link>
        </div>
        <div className="word-slots">
          {today.words.map((name, i) => {
            const word = catalog.find((w) => w.word === name);
            return (
              <div className="word-slot filled" key={name}>
                <span className="slot-number">{String(i + 1).padStart(2, '0')}</span>
                <Link href={`/collection?word=${encodeURIComponent(name)}`}>
                  <h3>{name}</h3>
                  <span>
                    {word?.partOfSpeech} · {word?.difficulty}
                  </span>
                </Link>
                {today.completed.includes(name) ? (
                  <Check size={20} />
                ) : (
                  !today.started && (
                    <button
                      className="icon-button"
                      disabled={busy}
                      onClick={() => void dispatch({ type: 'remove', word: name })}
                      aria-label={`Remove ${name} from today`}
                    >
                      <X size={17} />
                    </button>
                  )
                )}
              </div>
            );
          })}
          {Array.from({ length: today.goal - today.words.length }, (_, i) => (
            <Link href="/suggested" className="word-slot empty-slot" key={i}>
              <span className="slot-number">
                {String(today.words.length + i + 1).padStart(2, '0')}
              </span>
              <Plus size={22} />
              <span>Choose a word</span>
            </Link>
          ))}
        </div>
      </section>
      <div className="vocabulary-tools">
        <CaptureInbox />
        <UseTogether />
      </div>
      <section className="home-bottom">
        <div className="practice-tip">
          <span className="tip-icon">
            <Sparkles size={22} />
          </span>
          <div>
            <span className="eyebrow">BEYOND THE DEFINITION</span>
            <h3>Don’t just know it. Use it.</h3>
            <p>
              {today.completed.length
                ? `Try using “${today.completed[0]}” in a message or conversation today.`
                : 'Connect each new word to something in your own life. That’s where remembering begins.'}
            </p>
          </div>
        </div>
        <div className="mini-stats">
          <div>
            <BookOpen size={19} />
            <strong>{stats.learned}</strong>
            <span>words learned</span>
          </div>
          <div>
            <Target size={19} />
            <strong>{stats.xp}</strong>
            <span>total XP</span>
          </div>
        </div>
      </section>
    </>
  );
}
