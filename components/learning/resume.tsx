'use client';
import { workspace } from '@/lib/practice';
import { useStore } from '../store';
export function ResumeSession({
  kind,
  onResume,
}: {
  kind: 'learn' | 'review';
  onResume: (words: string[]) => void;
}) {
  const { state, catalog, dispatch, busy } = useStore();
  const draft = workspace(state).sessions[kind];
  if (!draft) return null;
  const valid = draft.words.every(
    (name) =>
      catalog.some((w) => w.word === name) &&
      state.words.some((w) => w.word === name && !w.archived && !w.known),
  );
  return (
    <section className="panel resume-panel" aria-label="Saved session">
      <div>
        <p className="eyebrow">PICK UP YOUR THREAD</p>
        <h2>Your {kind === 'learn' ? 'lesson' : 'review'} is waiting.</h2>
        <p>
          {valid
            ? `Word ${draft.index + 1} of ${draft.words.length} · ${draft.steps[draft.step]} · started ${draft.day}`
            : 'A word in this session is no longer available. Discard this draft to start a new session.'}
        </p>
        <p className="tiny">
          Saved answers stay with this session. Finishing an older lesson keeps its original daily
          set; practice activity counts on the day you finish.
        </p>
      </div>
      <div className="inline-actions">
        <button className="button" disabled={busy || !valid} onClick={() => onResume(draft.words)}>
          Resume saved {kind === 'learn' ? 'lesson' : 'review'}
        </button>
        <button
          className="text-link"
          disabled={busy}
          onClick={async () => {
            if (
              window.confirm(
                'Discard unfinished answers? Completed words and past progress will stay saved.',
              )
            )
              await dispatch({ type: 'discard-session', kind });
          }}
        >
          Discard unfinished session
        </button>
      </div>
    </section>
  );
}
