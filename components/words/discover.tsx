'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Plus, Check, Bookmark, X, Search, ArrowRight, BadgeCheck } from 'lucide-react';
import { ContextTip } from '../tutorial';
import { useStore } from '../store';
import { todaySet } from '@/lib/domain';
import { comparableWord } from '@/lib/validation/word';
import { WordDetail } from './detail';
import { demoMode } from '@/lib/config';
import { summarizeWord, type CatalogSummary } from '@/lib/catalog-summary';
import type { Word } from '@/lib/ai/schemas';

const PAGE_SIZE = 24;

export function Discover() {
  const { state, catalog, catalogSize, loadWord, dispatch, busy, notify } = useStore();
  const [filter, setFilter] = useState('For you'),
    [query, setQuery] = useState(''),
    [tab, setTab] = useState('Suggested'),
    [limit, setLimit] = useState(PAGE_SIZE),
    [remote, setRemote] = useState<CatalogSummary[]>([]),
    [remoteOffset, setRemoteOffset] = useState(0),
    [remoteReady, setRemoteReady] = useState(false),
    [total, setTotal] = useState(0),
    [hasMore, setHasMore] = useState(false),
    [loading, setLoading] = useState(false),
    [loadError, setLoadError] = useState(''),
    [selected, setSelected] = useState<Word | null>(null),
    [detailLoading, setDetailLoading] = useState('');
  const detail = useRef<HTMLElement>(null);
  const today = todaySet(state);

  const localWords = catalog
    .filter((word) => {
      const saved = state.words.find((item) => item.word === word.word);
      if (query.trim()) return comparableWord(word.word).includes(comparableWord(query));
      return (
        !state.dismissed.includes(word.word) &&
        (filter === 'For you' || word.categories.includes(filter)) &&
        (tab === 'My saved words'
          ? !!saved && !saved.archived && !today.words.includes(word.word)
          : !saved && word.difficulty === state.settings.level)
      );
    })
    .sort((a, b) => b.usefulness - a.usefulness)
    .map(summarizeWord);

  const fetchPage = useCallback(
    async (offset: number, append: boolean, signal?: AbortSignal) => {
      const parameters = new URLSearchParams({
        offset: String(offset),
        limit: String(PAGE_SIZE),
      });
      if (query.trim()) parameters.set('q', query.trim());
      else if (tab === 'Suggested') parameters.set('level', state.settings.level);
      if (filter !== 'For you' && (tab === 'Suggested' || query.trim()))
        parameters.set('category', filter);
      setLoading(true);
      setLoadError('');
      try {
        const response = await fetch(`/api/catalog?${parameters}`, { signal });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        const items = (data.items as CatalogSummary[]).filter((word) => {
          const saved = state.words.find((item) => item.word === word.word);
          if (query.trim()) return true;
          return !saved && !state.dismissed.includes(word.word);
        });
        setRemote((previous) => {
          const merged = append ? [...previous, ...items] : items;
          return [...new Map(merged.map((item) => [item.word, item])).values()];
        });
        setRemoteOffset(data.offset + (data.items as CatalogSummary[]).length);
        setRemoteReady(true);
        setTotal(data.total);
        setHasMore(data.hasMore);
      } catch (error) {
        if ((error as Error).name !== 'AbortError')
          setLoadError(error instanceof Error ? error.message : 'Words could not be loaded.');
      } finally {
        if (!signal?.aborted) setLoading(false);
      }
    },
    [filter, query, state.dismissed, state.settings.level, state.words, tab],
  );

  useEffect(() => {
    if (demoMode || (tab === 'My saved words' && !query.trim())) return;
    setRemoteReady(false);
    const controller = new AbortController();
    const timer = setTimeout(() => void fetchPage(0, false, controller.signal), 120);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [fetchPage, query, tab]);

  const useLocal = demoMode || (tab === 'My saved words' && !query.trim()) || !remoteReady;
  const words = useLocal ? localWords.slice(0, limit) : remote;
  const resultCount = useLocal ? localWords.length : total;

  async function ensureWord(name: string) {
    return catalog.find((word) => word.word === name) ?? (await loadWord(name));
  }
  async function add(name: string, toToday: boolean) {
    try {
      await ensureWord(name);
      if (!state.words.some((word) => word.word === name)) {
        if (await dispatch({ type: 'save', word: name, source: 'suggested', toToday }))
          notify(toToday ? 'Added to today’s wordlist.' : 'Saved to your wordbook.');
        return;
      }
      if (toToday) {
        if (await dispatch({ type: 'select', word: name })) notify('Added to today’s wordlist.');
      } else notify('Saved to your wordbook.');
    } catch (error) {
      notify(error instanceof Error ? error.message : 'That word could not be loaded.');
    }
  }
  async function know(name: string) {
    try {
      await ensureWord(name);
      if (await dispatch({ type: 'know', word: name, source: 'suggested' }))
        notify('Moved to Already know. This word will stay out of exercises.');
    } catch (error) {
      notify(error instanceof Error ? error.message : 'That word could not be loaded.');
    }
  }
  async function openWord(name: string) {
    setDetailLoading(name);
    try {
      setSelected(await ensureWord(name));
    } catch (error) {
      notify(error instanceof Error ? error.message : 'That word could not be loaded.');
    } finally {
      setDetailLoading('');
    }
  }
  useEffect(() => {
    if (selected) detail.current?.focus();
  }, [selected]);

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
          {['Suggested', 'My saved words'].map((value) => (
            <button key={value} aria-pressed={tab === value} onClick={() => setTab(value)}>
              {value}
            </button>
          ))}
        </div>
        <label className="search-field">
          <Search size={19} />
          <input
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setLimit(PAGE_SIZE);
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
        {resultCount} results in a library of {catalogSize.toLocaleString()} words.
      </p>
      {selected && (
        <section
          className="panel discover-detail"
          ref={detail}
          tabIndex={-1}
          aria-label={`${selected.word} details`}
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
          <WordDetail word={selected} />
        </section>
      )}
      {loadError && (
        <p className="error-banner" role="alert">
          {loadError}
        </p>
      )}
      <div className="discovery-grid" aria-busy={loading}>
        {words.map((word, index) => (
          <article className="discovery-card" key={word.word}>
            <div className="card-top">
              <span className={'category color-' + (index % 4)}>{word.categories[0]}</span>
              {!state.words.some((saved) => saved.word === word.word) && (
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
            <button
              className="discovery-open"
              disabled={detailLoading === word.word}
              onClick={() => void openWord(word.word)}
            >
              <h2>{word.word}</h2>
              <span className="word-meta">
                {word.partOfSpeech} <span>·</span> {word.difficulty} <span>·</span> Useful
              </span>
              <p>{word.definition}</p>
              <span className="text-link">
                {detailLoading === word.word ? 'Opening…' : 'View meanings & examples'}
              </span>
            </button>
            {state.words.some((saved) => saved.word === word.word) && (
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
                    (saved) =>
                      saved.word === word.word &&
                      (saved.archived || saved.known || !!saved.schedule.firstLearned),
                  )
                }
                onClick={() => void add(word.word, true)}
              >
                {today.words.includes(word.word) ? <Check size={17} /> : <Plus size={17} />}
                Add to today
              </button>
              {!state.words.some((saved) => saved.word === word.word) && (
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
      {loading && !words.length && (
        <div className="catalog-skeleton" aria-label="Finding words" role="status">
          <span />
          <span />
          <span />
        </div>
      )}
      {((demoMode && localWords.length > limit) ||
        (!demoMode && hasMore && !(tab === 'My saved words' && !query.trim()))) && (
        <button
          className="button secondary"
          disabled={loading}
          onClick={() =>
            demoMode ? setLimit(limit + PAGE_SIZE) : void fetchPage(remoteOffset, true)
          }
        >
          {loading ? 'Finding more…' : 'Show more words'}
        </button>
      )}
      {!loading && !words.length && (
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
