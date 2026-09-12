'use client';
import { useSearchParams } from 'next/navigation';
import { useState } from 'react';
import Link from 'next/link';
import { RotateCcw, Check, ArrowRight } from 'lucide-react';
import { useStore } from '../store';
import { dueWords } from '@/lib/domain';
import type { Word } from '@/lib/ai/schemas';
import { Session } from './session';
export function Review() {
  const { state, catalog } = useStore(),
    params = useSearchParams();
  const selected = params.get('word');
  const [session, setSession] = useState<Word[] | null>(null);
  const due = dueWords(state),
    learned = state.words.filter((w) => !w.archived && w.schedule.firstLearned);
  if (session) return <Session words={session} kind="review" onDone={() => setSession(null)} />;
  function start(names: string[]) {
    setSession(names.map((n) => catalog.find((w) => w.word === n)!).filter(Boolean));
  }
  const manual = learned.find((w) => w.word === selected);
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">KEEP THE GOOD WORDS CLOSE</p>
          <h1>A little recall. A lasting memory.</h1>
          <p>Your review queue adapts to what you remember and what needs another look.</p>
        </div>
      </div>
      {manual && (
        <div className="selection-strip">
          <strong>Practice “{manual.word}” again</strong>
          <button className="button" onClick={() => start([manual.word])}>
            Start practice
            <ArrowRight size={18} />
          </button>
        </div>
      )}
      <section className="review-hero panel">
        <span className="review-icon">
          <RotateCcw size={28} />
        </span>
        <h2>
          {due.length ? `${due.length} words are ready for another loop.` : 'You’re all caught up.'}
        </h2>
        <p>
          {due.length
            ? 'A short session now helps these words stay with you.'
            : 'Your next words will appear when they’re due. Enjoy the space between practice.'}
        </p>
        {due.length > 0 ? (
          <div className="inline-actions">
            <button className="button" onClick={() => start(due.slice(0, 5).map((w) => w.word))}>
              Quick review · {Math.min(5, due.length)} words
            </button>
            <button
              className="button secondary"
              onClick={() => start(due.slice(0, 30).map((w) => w.word))}
            >
              Full review · {Math.min(30, due.length)} words
            </button>
          </div>
        ) : (
          <Link href="/suggested" className="button secondary">
            Find your next words
            <ArrowRight size={18} />
          </Link>
        )}
      </section>
      <div className="section-heading">
        <div>
          <h2>{due.length ? 'Ready to revisit' : 'Coming back soon'}</h2>
          <p>Tricky words return sooner. Confident answers earn more space.</p>
        </div>
      </div>
      <div className="word-list">
        {(due.length
          ? due
          : learned.toSorted((a, b) =>
              (a.schedule.nextReview ?? '').localeCompare(b.schedule.nextReview ?? ''),
            )
        )
          .slice(0, 30)
          .map((w) => (
            <article key={w.word} className="library-row">
              <div className="word-initial">{w.word.slice(0, 1)}</div>
              <div>
                <h3>{w.word}</h3>
                <span>
                  {w.schedule.nextReview
                    ? new Intl.DateTimeFormat('en', {
                        dateStyle: 'medium',
                        timeZone: state.settings.timezone,
                      }).format(new Date(w.schedule.nextReview))
                    : ''}{' '}
                  · {w.schedule.reviewCount} practices
                </span>
              </div>
              <button className="text-link" onClick={() => start([w.word])}>
                Practice
                <ArrowRight size={17} />
              </button>
            </article>
          ))}
      </div>
      {!learned.length && (
        <div className="empty-state">
          <Check size={28} />
          <h3>A word learned is a loop started.</h3>
          <p>Complete your first lesson to build your review queue.</p>
        </div>
      )}
    </>
  );
}
