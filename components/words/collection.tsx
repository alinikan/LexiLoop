'use client';
import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Search, Star, ArrowLeft, ArrowRight, Plus, BadgeCheck } from 'lucide-react';
import { useStore } from '../store';
import { ContextTip } from '../tutorial';
import { WordDetail } from './detail';
import type { SavedWord } from '@/lib/domain';
function WordEditor({ saved, onClose }: { saved: SavedWord; onClose: () => void }) {
  const { catalog, dispatch, busy, notify } = useStore();
  const [note, setNote] = useState(saved.note),
    [context, setContext] = useState(saved.context),
    [tag, setTag] = useState(saved.tag),
    [confirm, setConfirm] = useState(false);
  const word = catalog.find((w) => w.word === saved.word);
  if (!word) return <p>Word content is unavailable. Reconnect and reload.</p>;
  return (
    <>
      <button className="text-link back-link" onClick={onClose}>
        <ArrowLeft size={17} /> My words
      </button>
      <div className="panel collection-detail">
        <WordDetail word={word} />
        <section className="personal-notes">
          <h3>Your corner of the wordbook</h3>
          <label>
            Your notes
            <textarea value={note} onChange={(e) => setNote(e.target.value)} maxLength={2000} />
          </label>
          <label>
            Where you found it
            <textarea
              value={context}
              onChange={(e) => setContext(e.target.value)}
              maxLength={2000}
            />
          </label>
          <label>
            Tag
            <input value={tag} onChange={(e) => setTag(e.target.value)} maxLength={40} />
          </label>
          {saved.sentence && <blockquote>Your sentence: {saved.sentence}</blockquote>}
          <ContextTip id="remove-word" title="Keep a wordbook you want to use">
            Remove a word to delete its saved notes and schedule. Past activity stays in your
            history. Archive it instead if you may want to restore its notes later.
          </ContextTip>
          <div className="inline-actions">
            <button
              className="button secondary"
              disabled={busy}
              onClick={async () => {
                const changed = saved.known
                  ? await dispatch({ type: 'practice-word', word: saved.word })
                  : await dispatch({ type: 'know', word: saved.word });
                if (changed)
                  notify(
                    saved.known
                      ? 'This word can appear in practice again.'
                      : 'Moved to Already know. It will stay out of exercises.',
                  );
              }}
            >
              <BadgeCheck size={17} />
              {saved.known ? 'Move to practice words' : 'I already know this word'}
            </button>
            <button
              className="button secondary"
              disabled={busy}
              onClick={async () => {
                if (
                  window.confirm(
                    `Remove ${saved.word} from My Words? Its notes and learning schedule will be deleted, and unfinished sessions containing it will close. Past activity remains. You can save the word again later.`,
                  ) &&
                  (await dispatch({ type: 'forget', word: saved.word }))
                ) {
                  notify('Word removed from My Words.');
                  onClose();
                }
              }}
            >
              Remove from My Words
            </button>
            <button
              className="button"
              disabled={busy}
              onClick={async () => {
                if (
                  await dispatch({
                    type: 'edit',
                    word: saved.word,
                    note,
                    context,
                    tag,
                    favorite: saved.favorite,
                    archived: saved.archived,
                  })
                )
                  notify('Your notes are saved.');
              }}
            >
              Save notes
            </button>
            <button
              className="button secondary"
              disabled={busy}
              onClick={() =>
                void dispatch({
                  type: 'edit',
                  word: saved.word,
                  note,
                  context,
                  tag,
                  favorite: !saved.favorite,
                  archived: saved.archived,
                })
              }
            >
              <Star size={17} />
              {saved.favorite ? 'Unfavorite' : 'Favorite'}
            </button>
            {saved.schedule.firstLearned && !saved.archived && !saved.known && (
              <Link
                href={`/review?word=${encodeURIComponent(saved.word)}`}
                className="button secondary"
              >
                Review again
              </Link>
            )}
          </div>
          <details>
            <summary>Progress & word management</summary>
            <p>
              Added {new Date(saved.addedAt).toLocaleDateString()} · {saved.schedule.reviewCount}{' '}
              practices · {saved.schedule.correctCount} correct · {saved.schedule.lapses} lapses
            </p>
            <p>
              Next review:{' '}
              {saved.schedule.nextReview
                ? new Date(saved.schedule.nextReview).toLocaleString()
                : 'Learn this word to begin its schedule.'}
            </p>
            <div className="inline-actions">
              <button
                className="button secondary"
                disabled={busy}
                onClick={() =>
                  void dispatch({
                    type: 'edit',
                    word: saved.word,
                    note,
                    context,
                    tag,
                    favorite: saved.favorite,
                    archived: !saved.archived,
                  })
                }
              >
                {saved.archived ? 'Restore word' : 'Archive word'}
              </button>
              <button className="text-link danger" onClick={() => setConfirm(true)}>
                Reset learning progress
              </button>
            </div>
            {confirm && (
              <div className="notice">
                <p>
                  Reset this word’s schedule and saved practice sentence? Your notes and past review
                  history will remain.
                </p>
                <button
                  className="button danger-button"
                  disabled={busy}
                  onClick={async () => {
                    if (await dispatch({ type: 'reset', word: saved.word })) {
                      setConfirm(false);
                      notify('Learning schedule reset.');
                    }
                  }}
                >
                  Reset this word
                </button>
                <button className="button secondary" onClick={() => setConfirm(false)}>
                  Cancel
                </button>
              </div>
            )}
          </details>
        </section>
        <ReviewHistory word={saved.word} />
      </div>
    </>
  );
}
function ReviewHistory({ word }: { word: string }) {
  const { state } = useStore();
  const events = state.events
    .filter((e) => e.word === word)
    .toReversed()
    .slice(0, 20);
  return (
    <details>
      <summary>Practice history ({state.events.filter((e) => e.word === word).length})</summary>
      {events.map((e) => (
        <p key={e.id}>
          {new Date(e.at).toLocaleString()} · {e.kind === 'learn' ? 'Lesson' : 'Review'} ·{' '}
          {e.quality >= 2 ? 'Recalled' : 'Needs practice'} · next interval{' '}
          {e.interval < 1 ? '10 minutes' : `${e.interval} days`}
        </p>
      ))}
    </details>
  );
}
export function Collection() {
  const { state, catalog, dispatch, busy } = useStore(),
    params = useSearchParams();
  const [selected, setSelected] = useState<string | null>(params.get('word')),
    [query, setQuery] = useState(''),
    [filter, setFilter] = useState('All words');
  useEffect(() => setSelected(params.get('word')), [params]);
  const saved = state.words.find((w) => w.word === selected);
  if (saved) return <WordEditor key={saved.word} saved={saved} onClose={() => setSelected(null)} />;
  const words = state.words
    .filter((w) => {
      if (!`${w.word} ${w.tag} ${w.note}`.toLowerCase().includes(query.toLowerCase())) return false;
      if (filter === 'Archived') return w.archived;
      if (w.archived) return false;
      switch (filter) {
        case 'Already know':
          return !!w.known;
        case 'Saved':
          return !w.known && !w.schedule.firstLearned;
        case 'Learning':
          return !w.known && w.schedule.firstLearned && w.schedule.interval < 7;
        case 'Learned':
          return !w.known && !!w.schedule.firstLearned;
        case 'Mastered':
          return !w.known && w.schedule.interval >= 30 && w.schedule.confidence >= 3;
        case 'Needs practice':
          return !w.known && w.schedule.lapses > 0 && w.schedule.streak < 2;
        case 'Favorites':
          return w.favorite;
        case 'Added by me':
          return w.source === 'personal';
        case 'Suggested':
          return w.source === 'suggested';
        default:
          return true;
      }
    })
    .toSorted((a, b) =>
      filter === 'Recently learned'
        ? (b.schedule.firstLearned ?? '').localeCompare(a.schedule.firstLearned ?? '')
        : Number(b.priority) - Number(a.priority) || b.addedAt.localeCompare(a.addedAt),
    );
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">A WORDBOOK THAT’S ALL YOURS</p>
          <h1>Your words, growing with you.</h1>
          <p>
            {state.words.filter((w) => !w.archived).length} saved words. Each one opens something
            new.
          </p>
        </div>
        <Link href="/add" className="button">
          <Plus size={18} />
          Add a word
        </Link>
      </div>
      <div className="toolbar">
        <label className="search-field wide">
          <Search size={19} />
          <input
            placeholder="Search words, notes, or tags"
            aria-label="Search your collection"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <label className="sr-only" htmlFor="collection-filter">
          Filter collection
        </label>
        <select id="collection-filter" value={filter} onChange={(e) => setFilter(e.target.value)}>
          {[
            'All words',
            'Already know',
            'Saved',
            'Learning',
            'Learned',
            'Mastered',
            'Needs practice',
            'Favorites',
            'Added by me',
            'Suggested',
            'Recently learned',
            'Archived',
          ].map((f) => (
            <option key={f}>{f}</option>
          ))}
        </select>
      </div>
      <div className="word-list">
        {words.map((w) => (
          <article className="library-row" key={w.word}>
            <button
              className="word-initial"
              aria-label={`View ${w.word}`}
              onClick={() => setSelected(w.word)}
            >
              {w.word[0]}
            </button>
            <button className="row-word" onClick={() => setSelected(w.word)}>
              <h3>{w.word}</h3>
              <span>{catalog.find((c) => c.word === w.word)?.meanings[0].definition}</span>
              <small>
                {w.tag || w.source} ·{' '}
                {w.known
                  ? 'Already know'
                  : w.schedule.firstLearned
                    ? w.schedule.interval >= 30 && w.schedule.confidence >= 3
                      ? 'Mastered'
                      : 'Learning'
                    : 'Saved for later'}
              </small>
            </button>
            <button
              disabled={busy}
              className={'icon-button ' + (w.favorite ? 'favorited' : '')}
              aria-label={`${w.favorite ? 'Unfavorite' : 'Favorite'} ${w.word}`}
              onClick={() =>
                void dispatch({
                  type: 'edit',
                  word: w.word,
                  note: w.note,
                  context: w.context,
                  tag: w.tag,
                  favorite: !w.favorite,
                  archived: w.archived,
                })
              }
            >
              <Star size={20} />
            </button>
            <button
              className="icon-button"
              aria-label={`Open ${w.word}`}
              onClick={() => setSelected(w.word)}
            >
              <ArrowRight size={19} />
            </button>
          </article>
        ))}
      </div>
      {!words.length && (
        <div className="empty-state">
          <span className="letter-tile">Aa</span>
          <h2>
            {state.words.length
              ? 'No words match just yet.'
              : 'Your wordbook starts with one word.'}
          </h2>
          <p>
            {state.words.length
              ? 'Try another search or filter.'
              : 'Save a word you’ve heard, or discover one you’ll use.'}
          </p>
          <Link href="/suggested" className="button">
            Discover useful words
          </Link>
        </div>
      )}
    </>
  );
}
