'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import Link from 'next/link';
import { BookOpen, ArrowRight } from 'lucide-react';
import { useStore } from '../store';
import { todaySet } from '@/lib/domain';
import { Session } from './session';
import { ResumeSession } from './resume';
import { workspace } from '@/lib/practice';
import type { Word } from '@/lib/ai/schemas';
export function Learn() {
  const { state, catalog, dispatch, busy } = useStore(),
    router = useRouter(),
    today = todaySet(state);
  const [words, setWords] = useState<Word[] | null>(null);
  if (words) return <Session words={words} kind="learn" onDone={() => router.push('/')} />;
  if (workspace(state).sessions.learn)
    return (
      <ResumeSession
        kind="learn"
        onResume={(names) => setWords(names.map((name) => catalog.find((w) => w.word === name)!))}
      />
    );
  const remaining = today.words.filter((w) => !today.completed.includes(w));
  return (
    <div className="empty-state panel lesson-intro">
      <BookOpen size={38} />
      <p className="eyebrow">YOUR DAILY PRACTICE</p>
      <h1>
        {!remaining.length && today.completed.length
          ? 'You finished today’s loop.'
          : 'Let’s make these words stick.'}
      </h1>
      <p>
        {today.words.length < today.goal
          ? `Choose ${today.goal - today.words.length} more words to build your daily set.`
          : remaining.length
            ? 'First meet all your new words. Then mix exercises with every active word you have learned, with extra practice for tricky skills. Pause and resume whenever you like.'
            : 'You can keep practicing in Review.'}
      </p>
      <div className="word-chips">
        {remaining.map((w) => (
          <span key={w}>{w}</span>
        ))}
      </div>
      {today.words.length < today.goal ? (
        <Link className="button" href="/suggested">
          Choose today’s words
          <ArrowRight size={18} />
        </Link>
      ) : remaining.length ? (
        <button
          className="button"
          disabled={busy}
          onClick={async () => {
            if (today.started || (await dispatch({ type: 'start' })))
              setWords(
                [
                  ...new Set([
                    ...remaining,
                    ...state.words
                      .filter((w) => !w.archived && w.schedule.firstLearned)
                      .map((w) => w.word),
                  ]),
                ].map((w) => catalog.find((c) => c.word === w)!),
              );
          }}
        >
          {today.started ? 'Continue lesson' : 'Start lesson'}
          <ArrowRight size={18} />
        </button>
      ) : (
        <Link className="button" href="/review">
          Open review
        </Link>
      )}
      <p className="tiny">
        Your question, answers and completed words are saved as you go. Wait for the saved status
        before closing.
      </p>
    </div>
  );
}
