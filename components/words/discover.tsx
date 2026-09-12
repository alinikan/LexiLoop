'use client';
import { useState } from 'react';
import Link from 'next/link';
import { Plus, Check, Bookmark, X, Search, ArrowRight } from 'lucide-react';
import { useStore } from '../store';
import { todaySet } from '@/lib/domain';
export function Discover() {
  const { state, catalog, dispatch, busy, notify } = useStore();
  const [filter, setFilter] = useState('For you'),
    [query, setQuery] = useState(''),
    [tab, setTab] = useState('Suggested');
  const today = todaySet(state);
  const levels = ['A2', 'B1', 'B2', 'C1'];
  const words = catalog
    .filter(
      (w) =>
        !state.dismissed.includes(w.word) &&
        (!query || w.word.includes(query.toLowerCase())) &&
        (filter === 'For you' || w.categories.includes(filter)) &&
        (tab === 'My saved words'
          ? state.words.some(
              (s) =>
                s.word === w.word &&
                !s.archived &&
                !s.schedule.firstLearned &&
                !today.words.includes(w.word),
            )
          : !state.words.some((s) => s.word === w.word)),
    )
    .sort((a, b) => {
      const rank = (w: typeof a) =>
        w.usefulness +
        Math.min(
          8,
          state.words.filter(
            (saved) =>
              saved.schedule.firstLearned &&
              saved.schedule.confidence < 2 &&
              catalog
                .find((c) => c.word === saved.word)
                ?.categories.some((c) => w.categories.includes(c)),
          ).length * 2,
        ) +
        (w.categories.some((c) => state.settings.interests.includes(c)) ? 12 : 0) -
        Math.abs(levels.indexOf(w.difficulty) - levels.indexOf(state.settings.level)) * 10;
      return rank(b) - rank(a);
    });
  async function add(name: string, toToday: boolean) {
    if (!state.words.some((w) => w.word === name)) {
      if (await dispatch({ type: 'save', word: name, source: 'suggested', toToday }))
        notify(toToday ? 'Added to today’s wordlist.' : 'Saved to your wordbook.');
      return;
    }
    if (toToday) {
      if (await dispatch({ type: 'select', word: name })) notify('Added to today’s wordlist.');
    } else notify('Saved to your wordbook.');
  }
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">DISCOVER SOMETHING USEFUL</p>
          <h1>Meet your next words.</h1>
          <p>For your work, your conversations, and everything in between.</p>
        </div>
      </div>
      <div className="selection-strip">
        <div>
          <strong>
            {today.words.length} of {today.goal} words selected
          </strong>
          <span>
            {today.started
              ? 'Lesson started — your set is locked'
              : `${today.goal - today.words.length} slots remaining`}
          </span>
        </div>
        <Link className="button" href={today.words.length === today.goal ? '/learn' : '/'}>
          {today.words.length === today.goal ? 'Go to lesson' : 'View today'}
          <ArrowRight size={18} />
        </Link>
      </div>
      <div className="toolbar">
        <div className="segmented" aria-label="Word source">
          {['Suggested', 'My saved words'].map((t) => (
            <button key={t} aria-pressed={tab === t} onClick={() => setTab(t)}>
              {t}
            </button>
          ))}
        </div>
        <label className="search-field">
          <Search size={19} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Find a word"
            aria-label="Find a suggested word"
          />
        </label>
      </div>
      <div className="chips" aria-label="Categories">
        {['For you', 'Everyday', 'Workplace', 'Academic', 'Conversation', 'Reading'].map(
          (category) => (
            <button
              key={category}
              aria-pressed={filter === category}
              onClick={() => setFilter(category)}
            >
              {category}
            </button>
          ),
        )}
      </div>
      <div className="discovery-grid">
        {words.map((word, i) => (
          <article className="discovery-card" key={word.word}>
            <div className="card-top">
              <span className={'category color-' + (i % 4)}>{word.categories[0]}</span>
              {tab === 'Suggested' && (
                <button
                  className="icon-button"
                  disabled={busy}
                  aria-label={`Not interested in ${word.word}`}
                  onClick={() => void dispatch({ type: 'dismiss', word: word.word })}
                >
                  <X size={17} />
                </button>
              )}
            </div>
            <h2>{word.word}</h2>
            <span className="word-meta">
              {word.partOfSpeech} <span>·</span> {word.difficulty} <span>·</span> Highly useful
            </span>
            <p>{word.meanings[0].definition}</p>
            <div className="card-actions">
              <button
                className="button secondary"
                disabled={busy || today.started || today.words.length >= today.goal}
                onClick={() => void add(word.word, true)}
              >
                {today.words.includes(word.word) ? <Check size={17} /> : <Plus size={17} />}Add to
                today
              </button>
              {tab === 'Suggested' && (
                <button
                  className="icon-button bookmark"
                  disabled={busy}
                  onClick={() => void add(word.word, false)}
                  aria-label={`Save ${word.word} for later`}
                >
                  <Bookmark size={20} />
                </button>
              )}
            </div>
          </article>
        ))}
      </div>
      {!words.length && (
        <div className="empty-state">
          <Search size={32} />
          <h2>No words here yet.</h2>
          <p>Try a different filter, or add a word you’ve encountered.</p>
          <Link href="/add" className="button">
            Add your own word
          </Link>
        </div>
      )}
    </>
  );
}
