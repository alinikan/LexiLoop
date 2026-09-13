'use client';
import { useState } from 'react';
import Link from 'next/link';
import { Sparkles, ArrowRight } from 'lucide-react';
import { useStore } from './store';
import { todaySet } from '@/lib/domain';
import { recommendations, workspace } from '@/lib/practice';
import { ContextTip } from './tutorial';
export function DailyPlan() {
  const { state, catalog, dispatch, busy, notify } = useStore();
  const today = todaySet(state);
  const options = recommendations(state, catalog, today.date);
  const [editing, setEditing] = useState(false);
  const [selection, setSelection] = useState<string[]>([]);
  if (today.started) return null;
  function open() {
    setSelection(
      today.words.length ? [...today.words] : options.slice(0, today.goal).map((w) => w.word),
    );
    setEditing(true);
  }
  return (
    <section className="panel daily-plan" aria-label="Daily recommendations">
      <div className="section-heading">
        <div>
          <p className="eyebrow">
            <Sparkles size={15} /> A STARTING POINT, NOT A RULE
          </p>
          <h2>{today.words.length ? 'Your words. Your choice.' : 'A few words picked for you.'}</h2>
          <p>
            Saved priorities and your interests come first. Change the words or the size of today’s
            set before you start.
          </p>
        </div>
        <button className="button secondary" disabled={busy || !options.length} onClick={open}>
          {today.words.length ? 'Edit today’s set' : 'Preview my recommendations'}
        </button>
      </div>
      <ContextTip id="daily-plan" title="You choose the final set">
        Recommendations do not add anything until you accept. Select, remove or swap any word below.
        The number you accept becomes today’s goal only; your usual goal stays the same.
      </ContextTip>
      {!options.length && (
        <p>
          No new suggestions remain in your available cards.{' '}
          <Link className="text-link" href="/add">
            Add a word from your world
          </Link>
          .
        </p>
      )}
      {workspace(state).sessions.learn && (
        <p>
          <Link className="text-link" href="/learn">
            Resume your saved lesson
          </Link>{' '}
          before starting another, or discard its unfinished answers there.
        </p>
      )}
      {editing && (
        <div className="plan-editor">
          <fieldset>
            <legend>Your recommended set · {selection.length} selected</legend>
            <div className="plan-options">
              {options.map((option) => (
                <label key={option.word} className="plan-option">
                  <input
                    type="checkbox"
                    checked={selection.includes(option.word)}
                    disabled={!selection.includes(option.word) && selection.length >= 20}
                    onChange={(e) =>
                      setSelection(
                        e.target.checked
                          ? [...selection, option.word]
                          : selection.filter((w) => w !== option.word),
                      )
                    }
                  />
                  <span>
                    <strong>{option.word}</strong>
                    <small>{option.reason}</small>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
          <div className="inline-actions">
            <button
              className="button"
              disabled={busy || !selection.length}
              onClick={async () => {
                if (await dispatch({ type: 'daily-plan', words: selection })) {
                  setEditing(false);
                  notify('Your chosen set is ready. You can still edit it before starting.');
                }
              }}
            >
              Use these {selection.length} words <ArrowRight size={17} />
            </button>
            <button className="text-link" onClick={() => setEditing(false)}>
              Cancel changes
            </button>
            <Link href="/add" className="text-link">
              Add a different word
            </Link>
          </div>
        </div>
      )}
    </section>
  );
}
