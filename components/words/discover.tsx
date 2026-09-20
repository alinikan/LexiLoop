'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Plus, Check, Bookmark, X, Search, ArrowRight, BadgeCheck } from 'lucide-react';
import { ContextTip } from '../tutorial';
import { useStore } from '../store';
import { todaySet } from '@/lib/domain';
import { comparableWord } from '@/lib/validation/word';
import { WordDetail } from './detail';
export function Discover() {
  const { state, catalog, dispatch, busy, notify } = useStore();
  const [filter, setFilter] = useState('For you'),
    [query, setQuery] = useState(''),
    [tab, setTab] = useState('Suggested'),
    [limit, setLimit] = useState(24),
    [selected, setSelected] = useState<string | null>(null);
  const detail = useRef<HTMLElement>(null);
  const today = todaySet(state);
  const levels = ['A2', 'B1', 'B2', 'C1'];
  const words = catalog
    .filter((w) => {
      const saved = state.words.find((s) => s.word === w.word);
      if (query.trim()) return comparableWord(w.word).includes(comparableWord(query));
      return (
        !state.dismissed.includes(w.word) &&
        (filter === 'For you' || w.categories.includes(filter)) &&
        (tab === 'My saved words'
          ? !!saved && !saved.archived && !today.words.includes(w.word)
          : !saved && w.difficulty === state.settings.level)
      );
    })
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
  async function know(name: string) {
    if (await dispatch({ type: 'know', word: name, source: 'suggested' }))
      notify('Moved to Already know. This word will stay out of exercises.');
  }
  useEffect(() => {
    if (selected) detail.current?.focus();
  }, [selected]);
  const selectedWord = catalog.find((word) => word.word === selected);
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
      <ContextTip id="combined-search" title="One search for your whole vocabulary">
        Search finds suggested and saved words together, at every level. Clear the search to browse
        your chosen level, or open My saved words. Change Vocabulary level in Settings for different
        suggestions.
      </ContextTip>
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
            onChange={(e) => {
              setQuery(e.target.value);
              setLimit(24);
            }}
            placeholder="Find a word"
            aria-label="Find a word across suggested and saved words"
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
      <p className="notice" role="status">
        {query.trim()
          ? 'Searching Suggested and My Saved Words, across every level.'
          : tab === 'Suggested'
            ? `Showing ${state.settings.level} words. Change your level in Settings.`
            : 'Your saved words, across every level.'}{' '}
        {words.length} results in a library of {catalog.length} words.
      </p>
      {selectedWord && (
        <section
          className="panel discover-detail"
          ref={detail}
          tabIndex={-1}
          aria-label={`${selectedWord.word} details`}
        >
          <div className="section-heading">
            <div>
              <p className="eyebrow">WORD PREVIEW</p>
              <h2>Meaning, examples, and real-life use</h2>
            </div>
            <button
              className="icon-button"
              aria-label="Close word details"
              onClick={() => setSelected(null)}
            >
              <X size={20} />
            </button>
          </div>
          <WordDetail word={selectedWord} />
        </section>
      )}
      <div className="discovery-grid">
        {words.slice(0, limit).map((word, i) => (
          <article className="discovery-card" key={word.word}>
            <div className="card-top">
              <span className={'category color-' + (i % 4)}>{word.categories[0]}</span>
              {!state.words.some((s) => s.word === word.word) && (
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
            <button className="discovery-open" onClick={() => setSelected(word.word)}>
              <h2>{word.word}</h2>
              <span className="word-meta">
                {word.partOfSpeech} <span>·</span> {word.difficulty} <span>·</span> Highly useful
              </span>
              <p>{word.meanings[0].definition}</p>
              <span className="text-link">View meanings & examples</span>
            </button>
            {state.words.some((s) => s.word === word.word) && (
              <Link
                className="text-link"
                href={`/collection?word=${encodeURIComponent(word.word)}`}
              >
                In My Saved Words
              </Link>
            )}
            <div className="card-actions">
              <button
                className="button secondary"
                disabled={
                  busy ||
                  today.started ||
                  today.words.length >= today.goal ||
                  today.words.includes(word.word) ||
                  state.words.some(
                    (s) =>
                      s.word === word.word && (s.archived || s.known || !!s.schedule.firstLearned),
                  )
                }
                onClick={() => void add(word.word, true)}
              >
                {today.words.includes(word.word) ? <Check size={17} /> : <Plus size={17} />}Add to
                today
              </button>
              {!state.words.some((s) => s.word === word.word) && (
                <button
                  className="icon-button bookmark"
                  disabled={busy}
                  onClick={() => void add(word.word, false)}
                  aria-label={`Save ${word.word} for later`}
                >
                  <Bookmark size={20} />
                </button>
              )}
              <button
                className="button quiet"
                disabled={
                  busy || state.words.some((saved) => saved.word === word.word && saved.known)
                }
                onClick={() => void know(word.word)}
              >
                <BadgeCheck size={17} />
                {state.words.some((saved) => saved.word === word.word && saved.known)
                  ? 'Already know'
                  : 'I know this'}
              </button>
            </div>
          </article>
        ))}
      </div>
      {words.length > limit && (
        <button className="button secondary" onClick={() => setLimit(limit + 24)}>
          Show more words
        </button>
      )}
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
