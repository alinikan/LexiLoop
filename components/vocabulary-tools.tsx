'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useStore } from './store';
import { workspace, containsWord, memoryMetrics, weakSkills } from '@/lib/practice';
import { ContextTip } from './tutorial';
export function CaptureInbox() {
  const { state, dispatch, busy, notify } = useStore();
  const [word, setWord] = useState(''),
    [context, setContext] = useState(''),
    [editing, setEditing] = useState<string | null>(null);
  return (
    <section className="panel capture-panel" aria-label="Quick capture inbox">
      <p className="eyebrow">DON’T LOSE A GOOD WORD</p>
      <h2>Catch it now. Explore it later.</h2>
      <p>
        Save a word or short expression from a conversation, message or something you read. No
        lesson needs to be built yet.
      </p>
      <ContextTip id="capture" title="Keep the moment with the word">
        Paste the sentence into Context and enter the word you want to keep. Build a card later to
        add it to your wordbook. Captures stay private and do not make an AI request.
      </ContextTip>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (
            await dispatch({ type: 'capture', id: editing ?? crypto.randomUUID(), word, context })
          ) {
            setWord('');
            setContext('');
            setEditing(null);
            notify('Captured. Come back whenever you like.');
          }
        }}
      >
        <label>
          Word to capture
          <input
            value={word}
            maxLength={60}
            minLength={2}
            required
            onChange={(e) => setWord(e.target.value)}
            placeholder="A word worth remembering"
          />
        </label>
        <label>
          Context for later
          <textarea
            value={context}
            maxLength={2000}
            onChange={(e) => setContext(e.target.value)}
            placeholder="Paste the sentence, or remind yourself where you heard it…"
          />
        </label>
        <div className="inline-actions">
          <button className="button" disabled={busy}>
            {editing ? 'Update capture' : 'Save to inbox'}
          </button>
          {editing && (
            <button
              type="button"
              className="text-link"
              onClick={() => {
                setEditing(null);
                setWord('');
                setContext('');
              }}
            >
              Cancel edit
            </button>
          )}
        </div>
      </form>
      <details className="inbox-list" open={workspace(state).inbox.length > 0}>
        <summary>Your inbox · {workspace(state).inbox.length}/100</summary>
        {workspace(state).inbox.length === 0 && (
          <p>Nothing captured yet. Your next discovery can start here.</p>
        )}
        {workspace(state).inbox.map((c) => (
          <article key={c.id}>
            <div>
              <h3>{c.word}</h3>
              <p>{c.context || 'No context added.'}</p>
            </div>
            <div className="inline-actions">
              <Link className="text-link" href={`/add?capture=${c.id}`}>
                Build this word card
              </Link>
              <button
                className="text-link"
                onClick={() => {
                  setEditing(c.id);
                  setWord(c.word);
                  setContext(c.context);
                }}
              >
                Edit capture
              </button>
              <button
                className="text-link"
                disabled={busy}
                onClick={async () => {
                  if (window.confirm(`Remove “${c.word}” from your inbox?`))
                    await dispatch({ type: 'remove-capture', id: c.id });
                }}
              >
                Remove capture
              </button>
            </div>
          </article>
        ))}
      </details>
    </section>
  );
}
const situations = [
  'A message to a friend',
  'An idea at work',
  'Something that happened today',
  'A decision I want to explain',
];
export function UseTogether() {
  const { state, catalog, dispatch, busy, notify } = useStore();
  const choices = state.words.filter((w) => !w.archived);
  const [selected, setSelected] = useState<string[]>([]),
    [text, setText] = useState(''),
    [situation, setSituation] = useState(situations[0]),
    [reflection, setReflection] = useState<'ready' | 'revisit'>('revisit');
  return (
    <section className="panel usage-panel" aria-label="Use words together">
      <p className="eyebrow">FROM YOUR WORDBOOK TO YOUR WORLD</p>
      <h2>One thought. A few useful words.</h2>
      <p>
        Choose two or three words and express something you might actually say. This is vocabulary
        practice, not a grammar test.
      </p>
      <ContextTip id="usage" title="Use the words, keep your voice">
        Try a short message or thought, then compare each word with its meaning. We check that your
        chosen words appear, but do not grade meaning, grammar or fluency. Your reflection is
        self-reported.
      </ContextTip>
      {choices.length < 2 ? (
        <p>
          Save at least two words to start.{' '}
          <Link href="/suggested" className="text-link">
            Find your next words
          </Link>
        </p>
      ) : (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (
              await dispatch({
                type: 'usage',
                id: crypto.randomUUID(),
                words: selected,
                situation,
                text,
                reflection,
              })
            ) {
              setText('');
              setSelected([]);
              setReflection('revisit');
              notify('Your vocabulary practice is saved.');
            }
          }}
        >
          <fieldset>
            <legend>Choose 2–3 words</legend>
            <div className="usage-words">
              {choices.map((w) => (
                <button
                  key={w.word}
                  type="button"
                  aria-pressed={selected.includes(w.word)}
                  disabled={!selected.includes(w.word) && selected.length === 3}
                  onClick={() =>
                    setSelected(
                      selected.includes(w.word)
                        ? selected.filter((n) => n !== w.word)
                        : [...selected, w.word],
                    )
                  }
                >
                  {w.word}
                </button>
              ))}
            </div>
          </fieldset>
          <label>
            A situation from your life
            <select value={situation} onChange={(e) => setSituation(e.target.value)}>
              {situations.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </label>
          <label>
            Your thought
            <textarea
              required
              minLength={10}
              maxLength={2000}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="What would you actually say?"
            />
          </label>
          <div className="usage-checks">
            {selected.map((name) => (
              <details key={name}>
                <summary>
                  {containsWord(text, name) ? '✓' : '○'} {name} · check its meaning
                </summary>
                <p>{catalog.find((w) => w.word === name)?.meanings[0].definition}</p>
                <p>{catalog.find((w) => w.word === name)?.meanings[0].examples[0]}</p>
              </details>
            ))}
          </div>
          <label>
            After checking the meanings…
            <select
              value={reflection}
              onChange={(e) => setReflection(e.target.value as 'ready' | 'revisit')}
            >
              <option value="revisit">I want to revisit this wording</option>
              <option value="ready">I feel ready to use these words</option>
            </select>
          </label>
          <p className="tiny">
            Use the displayed word forms so the presence check can find them. A checkmark confirms
            presence, not correct usage. This activity does not change your review schedule or award
            recall accuracy.
          </p>
          <button
            className="button"
            disabled={busy || selected.length < 2 || !selected.every((w) => containsWord(text, w))}
          >
            Save vocabulary practice
          </button>
        </form>
      )}
      <details className="usage-history">
        <summary>Your practice journal · {workspace(state).usage.length}/100</summary>
        {workspace(state).usage.map((p) => (
          <article key={p.id}>
            <p className="eyebrow">{p.situation}</p>
            <h3>{p.words.join(' · ')}</h3>
            <p>{p.text}</p>
            <small>
              {p.reflection === 'ready' ? 'Self-reported: ready to use' : 'Wording to revisit'}
            </small>
            <button
              className="text-link"
              disabled={busy}
              onClick={async () => {
                if (window.confirm('Remove this practice entry?'))
                  await dispatch({ type: 'remove-usage', id: p.id });
              }}
            >
              Remove practice entry
            </button>
          </article>
        ))}
      </details>
    </section>
  );
}
export function MemoryProgress() {
  const { state } = useStore();
  const memory = memoryMetrics(state);
  return (
    <section className="panel memory-progress" aria-label="Memory evidence">
      <p className="eyebrow">MORE THAN A STREAK</p>
      <h2>What comes back to mind?</h2>
      <ContextTip id="memory" title="Evidence, not a promise of mastery">
        Delayed recall counts the first typed recall in reviews at least 24 hours after the previous
        practice. Same-day repetition and confidence ratings do not count. Older sessions without
        these measurements stay unmeasured.
      </ContextTip>
      <div className="memory-grid">
        <div>
          <strong>{memory.encountered}</strong>
          <span>Active words saved</span>
        </div>
        <div>
          <strong>{memory.recalled}</strong>
          <span>Words recalled after a delay</span>
        </div>
        <div>
          <strong>
            {memory.delayedAttempts
              ? `${memory.delayedCorrect}/${memory.delayedAttempts}`
              : 'Not yet measured'}
          </strong>
          <span>Correct delayed recall attempts</span>
        </div>
        <div>
          <strong>{memory.used}</strong>
          <span>Words you felt ready to use*</span>
        </div>
      </div>
      <p className="tiny">
        Delayed = at least 24 hours since the previous practice, measured on completed reviews.
        Active words only. *Self-reported in your retained practice journal; not independently
        assessed usage.
      </p>
      {memory.tricky.length > 0 && (
        <div>
          <h3>A little more attention</h3>
          {memory.tricky.slice(0, 8).map((w) => (
            <p key={w.word}>
              <Link className="text-link" href={`/review?word=${encodeURIComponent(w.word)}`}>
                {w.word}
              </Link>{' '}
              · {weakSkills(w).join(', ')}
            </p>
          ))}
        </div>
      )}
    </section>
  );
}
