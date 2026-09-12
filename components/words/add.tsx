'use client';
import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { ArrowRight, Plus, Check, Sparkles } from 'lucide-react';
import { useStore } from '../store';
import { WordDetail } from './detail';
import type { Word } from '@/lib/ai/schemas';
import { todaySet } from '@/lib/domain';
export function AddWord() {
  const { state, generate, dispatch, busy, notify } = useStore();
  const [input, setInput] = useState(''),
    [note, setNote] = useState(''),
    [context, setContext] = useState(''),
    [tag, setTag] = useState(''),
    [priority, setPriority] = useState(false),
    [word, setWord] = useState<Word | null>(null),
    [loading, setLoading] = useState(false),
    [error, setError] = useState('');
  const existing = state.words.find((w) => w.word === word?.word),
    today = todaySet(state);
  async function build(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    setWord(null);
    try {
      setWord(await generate(input));
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : 'Couldn’t build the lesson. Your input is still safe here.',
      );
    } finally {
      setLoading(false);
    }
  }
  async function save(toToday: boolean) {
    if (!word) return;
    if (
      !(await dispatch({
        type: 'save',
        word: word.word,
        source: 'personal',
        note,
        context,
        tag,
        priority,
        toToday,
      }))
    )
      return;
    notify(toToday ? 'Word saved and added to today.' : 'Your word is saved.');
  }
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">FROM YOUR WORLD, INTO YOUR WORDS</p>
          <h1>Found a new word?</h1>
          <p>Bring it here. We’ll help you make it yours.</p>
        </div>
      </div>
      <div className="add-layout">
        <form className="panel word-form" onSubmit={build}>
          <label>
            What’s the word?
            <input
              required
              minLength={2}
              maxLength={60}
              disabled={loading}
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                setWord(null);
              }}
              placeholder="e.g. reluctant"
              autoCapitalize="none"
              autoCorrect="off"
            />
          </label>
          <label>
            Where did you find it? <span>Optional note</span>
            <textarea
              maxLength={2000}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Heard it in a meeting this morning…"
            />
          </label>
          <label>
            The original sentence <span>Optional</span>
            <textarea
              maxLength={2000}
              value={context}
              onChange={(e) => setContext(e.target.value)}
              placeholder="A little context can make a word stick."
            />
          </label>
          <label>
            Tag <span>Optional</span>
            <input
              maxLength={40}
              value={tag}
              onChange={(e) => setTag(e.target.value)}
              placeholder="Work, books, travel…"
            />
          </label>
          <label className="check-label">
            <input
              type="checkbox"
              checked={priority}
              onChange={(e) => setPriority(e.target.checked)}
            />{' '}
            Prioritize this word
          </label>
          <button className="button full" disabled={loading || busy}>
            {loading ? 'Building your word card…' : 'Build word card'}
            <Sparkles size={18} />
          </button>
          <p className="tiny">
            Only the word is used to build your lesson. Your notes and sentences stay private.
          </p>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
        </form>
        <section className="panel preview-panel">
          {word ? (
            <>
              <div className="section-heading">
                <span className="eyebrow">REVIEW BEFORE SAVING</span>
                <button
                  className="text-link"
                  onClick={() => {
                    setWord(null);
                    document.querySelector<HTMLInputElement>('.word-form input')?.focus();
                  }}
                >
                  Edit word
                </button>
              </div>
              {existing && (
                <div className="notice">
                  <Check size={18} /> This word is already in your collection.
                  <Link href={`/collection?word=${encodeURIComponent(word.word)}`}>
                    View word & edit notes
                  </Link>
                  {existing.schedule.firstLearned && (
                    <Link href={`/review?word=${encodeURIComponent(word.word)}`}>Review again</Link>
                  )}
                </div>
              )}
              <WordDetail word={word} />
              {!existing && (
                <div className="sticky-actions">
                  <button className="button" disabled={busy} onClick={() => void save(false)}>
                    Save to my words
                    <ArrowRight size={18} />
                  </button>
                  <button
                    className="button secondary"
                    disabled={busy || today.started || today.words.length >= today.goal}
                    onClick={() => void save(true)}
                  >
                    <Plus size={18} />
                    Save & add to today
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="empty-state">
              <span className="letter-tile">Aa</span>
              <h2>A word worth keeping.</h2>
              <p>
                Your word card will appear here with clear meanings, natural examples, and a way to
                remember it.
              </p>
              <span className="tiny">Try “feasible”, “concise”, or “reluctant”.</span>
            </div>
          )}
        </section>
      </div>
    </>
  );
}
