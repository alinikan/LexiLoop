'use client';
import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { workspace } from '@/lib/practice';
import { ArrowRight, Plus, Check, Sparkles, BadgeCheck } from 'lucide-react';
import { useStore } from '../store';
import { WordDetail } from './detail';
import type { Word } from '@/lib/ai/schemas';
import { todaySet } from '@/lib/domain';
import { comparableWord, inputWordSchema, suggestWord } from '@/lib/validation/word';
export function AddWord() {
  const { state, catalog, generate, dispatch, busy, notify } = useStore();
  const params = useSearchParams();
  const capture = workspace(state).inbox.find((c) => c.id === params.get('capture'));
  const [input, setInput] = useState(capture?.word ?? ''),
    [note, setNote] = useState(''),
    [context, setContext] = useState(capture?.context ?? ''),
    [tag, setTag] = useState(''),
    [priority, setPriority] = useState(false),
    [word, setWord] = useState<Word | null>(null),
    [suggestion, setSuggestion] = useState<Word | null>(null),
    [lookupMessage, setLookupMessage] = useState(''),
    [loading, setLoading] = useState(false),
    [error, setError] = useState('');
  const existing = state.words.find((w) => w.word === word?.word),
    today = todaySet(state);
  const parsedInput = inputWordSchema.safeParse(input);
  const inputCard = parsedInput.success
    ? catalog.find(
        (candidate) => comparableWord(candidate.word) === comparableWord(parsedInput.data),
      )
    : undefined;
  const inputSaved = inputCard
    ? state.words.find((saved) => saved.word === inputCard.word)
    : undefined;
  async function build(e: FormEvent) {
    e.preventDefault();
    await buildWord(false);
  }
  async function buildWord(keepTypedWord: boolean) {
    setLoading(true);
    setError('');
    setWord(null);
    setLookupMessage('');
    try {
      const normalized = inputWordSchema.parse(input);
      const exact = catalog.find(
        (candidate) => comparableWord(candidate.word) === comparableWord(normalized),
      );
      if (exact) {
        setInput(exact.word);
        setWord(exact);
        setSuggestion(null);
        setLookupMessage(
          state.words.some((saved) => saved.word === exact.word)
            ? 'This word is already in My Words.'
            : 'This word already exists in the LexiLoop library. Here is its card.',
        );
        return;
      }
      if (!keepTypedWord) {
        const suggested = suggestWord(
          normalized,
          catalog.map((candidate) => candidate.word),
        );
        if (suggested) {
          setSuggestion(catalog.find((candidate) => candidate.word === suggested) ?? null);
          return;
        }
      }
      const result = await generate(normalized);
      const generated = result.word;
      setInput(generated.word);
      setSuggestion(null);
      setWord(generated);
      if (result.existing)
        setLookupMessage('This word already exists in LexiLoop. Here is its saved card.');
      else if (generated.word !== normalized)
        setLookupMessage(`Built the card as “${generated.word}”.`);
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
        captureId: capture?.id,
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
      {capture && (
        <p className="notice">
          From your quick-capture inbox. This capture is removed only after you save the new word
          card.
        </p>
      )}
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
                setSuggestion(null);
                setLookupMessage('');
              }}
              placeholder="e.g. reluctant"
              autoCapitalize="none"
              autoCorrect="off"
            />
          </label>
          {inputSaved && (
            <p className="field-note success" role="status">
              <Check size={16} /> “{inputCard?.word}” is already in My Words.
              <Link href={`/collection?word=${encodeURIComponent(inputCard!.word)}`}>Open it</Link>
            </p>
          )}
          {!inputSaved && inputCard && (
            <p className="field-note" role="status">
              “{inputCard.word}” already exists in LexiLoop. Build the card to preview it—no new
              generation is needed.
            </p>
          )}
          {suggestion && (
            <div className="suggestion-box" role="status">
              <strong>Did you mean “{suggestion.word}”?</strong>
              <p>{suggestion.meanings[0].definition}</p>
              <div className="inline-actions">
                <button
                  type="button"
                  className="button secondary"
                  onClick={() => {
                    setInput(suggestion.word);
                    setWord(suggestion);
                    setLookupMessage('Using the suggested spelling.');
                    setSuggestion(null);
                  }}
                >
                  Yes, use {suggestion.word}
                </button>
                <button type="button" className="text-link" onClick={() => void buildWord(true)}>
                  Keep “{input}”
                </button>
              </div>
            </div>
          )}
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
              {lookupMessage && (
                <p className="notice" role="status">
                  {lookupMessage}
                </p>
              )}
              <WordDetail word={word} />
              <div className="sticky-actions">
                {!existing && (
                  <>
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
                  </>
                )}
                <button
                  className="button quiet"
                  disabled={busy || !!existing?.known}
                  onClick={async () => {
                    if (await dispatch({ type: 'know', word: word.word, source: 'personal' }))
                      notify('Moved to Already know. This word will stay out of exercises.');
                  }}
                >
                  <BadgeCheck size={18} />
                  {existing?.known ? 'Already in your known words' : 'I already know this word'}
                </button>
              </div>
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
