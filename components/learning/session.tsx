'use client';
import { useState, useRef, useEffect, type SetStateAction } from 'react';
import { useRouter } from 'next/navigation';
import {
  createSession,
  createMixedSession,
  advanceMixed,
  workspace,
  practiceSteps,
  stepSkill,
  weakSkills,
  type SessionDraft,
} from '@/lib/practice';
import { ScreenScene } from '../words/screen-scene';
import { ContextTip } from '../tutorial';
import { ArrowRight, Check, Volume2, Lightbulb, Trophy, X } from 'lucide-react';
import { useStore } from '../store';
import { todaySet } from '@/lib/domain';
import type { Word } from '@/lib/ai/schemas';
export function Session({
  words,
  kind,
  onDone,
}: {
  words: Word[];
  kind: 'learn' | 'review';
  onDone: () => void;
}) {
  const { state, dispatch, busy } = useStore();
  const router = useRouter();
  const [draft, setDraft] = useState<SessionDraft>(
    () =>
      workspace(state).sessions[kind] ??
      (kind === 'learn' ? createMixedSession : createSession)(
        state,
        words
          .filter(
            (w) =>
              kind !== 'learn' ||
              !state.words.find((s) => s.word === w.word)?.schedule.firstLearned,
          )
          .map((w) => w.word),
        kind,
        todaySet(state).date,
        crypto.randomUUID(),
        crypto.randomUUID(),
      ),
  );
  const [done, setDone] = useState(false);
  const [saveStatus, setSaveStatus] = useState(() =>
    workspace(state).sessions[kind] ? 'Your place is saved' : 'Saving your place…',
  );
  const saved = useRef(JSON.stringify(workspace(state).sessions[kind] ?? null));
  const live = useRef(draft);
  useEffect(() => {
    live.current = draft;
  }, [draft]);
  const send = useRef(dispatch);
  useEffect(() => {
    send.current = dispatch;
  }, [dispatch]);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flight = useRef<Promise<boolean> | null>(null);
  const finalizing = useRef(false);
  const [savedKey, setSavedKey] = useState(() =>
    JSON.stringify(workspace(state).sessions[kind] ?? null),
  );
  const pending = JSON.stringify(draft) !== savedKey;
  async function savePlace() {
    if (timer.current) clearTimeout(timer.current);
    if (flight.current) await flight.current;
    const snapshot = live.current,
      key = JSON.stringify(snapshot);
    if (key === saved.current) {
      setSaveStatus('Your place is saved');
      return true;
    }
    setSaveStatus('Saving your place…');
    const request = send.current({ type: 'checkpoint', draft: snapshot });
    flight.current = request;
    const ok = await request;
    flight.current = null;
    if (ok) {
      saved.current = key;
      setSavedKey(key);
      setSaveStatus('Your place is saved');
    } else setSaveStatus('Not saved yet. Reconnect and retry before leaving.');
    return ok;
  }
  const saver = useRef(savePlace);
  useEffect(() => {
    saver.current = savePlace;
  });
  useEffect(() => {
    if (!done && !finalizing.current) timer.current = setTimeout(() => void saver.current(), 400);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [draft, done]);
  useEffect(() => {
    function leaving(e: BeforeUnloadEvent) {
      if (!done && JSON.stringify(live.current) !== saved.current) {
        e.preventDefault();
        e.returnValue = '';
      }
    }
    const background = () => {
      if (document.hidden && !done && !finalizing.current) void saver.current();
    };
    window.addEventListener('beforeunload', leaving);
    document.addEventListener('visibilitychange', background);
    return () => {
      window.removeEventListener('beforeunload', leaving);
      document.removeEventListener('visibilitychange', background);
    };
  }, [done]);
  useEffect(() => {
    async function navigate(event: MouseEvent) {
      if (
        done ||
        event.defaultPrevented ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey ||
        event.button !== 0
      )
        return;
      const anchor = (event.target as Element)?.closest?.('a');
      if (!anchor || anchor.target === '_blank' || anchor.hasAttribute('download')) return;
      const url = new URL(anchor.href, window.location.href);
      if (
        url.origin !== window.location.origin ||
        (url.pathname === location.pathname && url.search === location.search)
      )
        return;
      event.preventDefault();
      event.stopPropagation();
      if (await saver.current()) router.push(url.pathname + url.search + url.hash);
    }
    document.addEventListener('click', navigate, true);
    return () => document.removeEventListener('click', navigate, true);
  }, [done, router]);
  function field<K extends keyof SessionDraft>(key: K, value: SetStateAction<SessionDraft[K]>) {
    setDraft((d) => ({
      ...d,
      [key]:
        typeof value === 'function'
          ? (value as (v: SessionDraft[K]) => SessionDraft[K])(d[key])
          : value,
    }));
  }
  const { index, step, answer, text, sentence, checked, mistakes, confidence } = draft;
  const setAnswer = (value: number | null) => field('answer', value);
  const setText = (value: string) => field('text', value);
  const setSentence = (value: string) => field('sentence', value);
  const setConfidence = (value: number) => field('confidence', value);
  const card = useRef<HTMLDivElement>(null);
  useEffect(() => {
    card.current?.focus();
  }, [step, index, draft.mixed?.cursor]);
  const word = words.find((w) => w.word === draft.words[index])!;
  const activeSteps = draft.steps;
  const current = activeSteps[step];
  const exercise = word.exercises.find(
    (e) =>
      e.type ===
      (current === 'Understand'
        ? 'meaning'
        : current === 'Context'
          ? 'context'
          : current === 'Distinguish'
            ? 'distinction'
            : 'application'),
  )!;
  // Controlled variation: some context exercises require production instead of recognition.
  const typedContext =
    current === 'Context' &&
    word.word.length % 2 === 0 &&
    exercise.options[exercise.answer].trim().toLowerCase() === word.word.toLowerCase();
  const isChoice =
      ['Understand', 'Context', 'Distinguish', 'Apply'].includes(current) && !typedContext,
    isRecall = current === 'Recall' || typedContext,
    isProduce = current === 'Make it yours';
  const correct = isChoice
    ? answer === exercise.answer
    : text.trim().toLowerCase() === word.word.toLowerCase();
  function check() {
    if (checked) return;
    const skill = stepSkill(current);
    setDraft((d) => ({
      ...d,
      checked: true,
      mistakes: d.mistakes + Number(!correct),
      evidence: skill ? [...d.evidence, { skill, correct }] : d.evidence,
    }));
  }
  async function next() {
    if (draft.mixed && current !== 'Recap') {
      const next = advanceMixed(draft);
      if (next) setDraft(next);
      return;
    }
    if (step === activeSteps.length - 1) {
      finalizing.current = true;
      if (!(await savePlace())) {
        finalizing.current = false;
        return;
      }
      const nextDraft: SessionDraft | null = draft.mixed
        ? advanceMixed(draft)
        : index === words.length - 1
          ? null
          : {
              ...draft,
              index: index + 1,
              step: 0,
              steps: practiceSteps(
                kind,
                state.words.find((w) => w.word === words[index + 1].word),
              ),
              answer: null,
              text: '',
              sentence: '',
              checked: false,
              mistakes: 0,
              confidence: 2,
              evidence: [],
              eventId: crypto.randomUUID(),
            };
      const quality = mistakes > 0 ? 0 : confidence <= 1 ? 1 : confidence === 4 ? 3 : 2;
      if (
        !(await dispatch({
          type: 'complete',
          word: word.word,
          quality,
          confidence,
          day: kind === 'learn' ? draft.day : undefined,
          kind:
            kind === 'learn' &&
            !!state.words.find((w) => w.word === word.word)?.schedule.firstLearned
              ? 'review'
              : kind,
          sessionKind: kind,
          sentence,
          id: draft.eventId,
          evidence: draft.evidence,
          nextSession: nextDraft,
        }))
      ) {
        finalizing.current = false;
        return;
      }
      saved.current = JSON.stringify(nextDraft);
      setSavedKey(JSON.stringify(nextDraft));
      if (!nextDraft) {
        setDone(true);
        return;
      }
      setDraft(nextDraft);
      setSaveStatus('Your place is saved');
      finalizing.current = false;
    } else setDraft((d) => ({ ...d, step: d.step + 1, checked: false, answer: null, text: '' }));
  }
  if (done)
    return (
      <div className="session-complete panel">
        <div className="celebration">
          <Trophy size={46} />
        </div>
        <p className="eyebrow">A LITTLE MORE CONFIDENT</p>
        <h1>{kind === 'learn' ? 'These words are yours.' : 'Another loop, a little stronger.'}</h1>
        <p>
          You practiced {words.length} {words.length === 1 ? 'word' : 'words'} and earned{' '}
          {words.reduce(
            (n, w) =>
              n +
              (kind === 'learn' &&
              (!draft.mixed ||
                draft.mixed.queue.some(
                  (task) => task.step === 'Discover' && draft.words[task.index] === w.word,
                ))
                ? 20
                : 10),
            0,
          )}{' '}
          XP.
        </p>
        <p>Your next reviews are scheduled. Words that felt tricky will return sooner.</p>
        <div className="word-chips">
          {words.map((w) => (
            <span key={w.word}>{w.word}</span>
          ))}
        </div>
        <div className="simple-meaning">
          <span>Use one today</span>
          <p>Try “{words[0].word}” in your next message or conversation.</p>
        </div>
        <button className="button" onClick={onDone}>
          Back to {kind === 'learn' ? 'today' : 'review'}
          <ArrowRight size={18} />
        </button>
      </div>
    );
  return (
    <div className="session">
      <div className="session-save">
        <span role="status">
          {pending && saveStatus === 'Your place is saved' ? 'Saving your place…' : saveStatus}
        </span>
        {saveStatus.startsWith('Not saved') && (
          <button className="text-link" onClick={() => void savePlace()}>
            Retry save
          </button>
        )}
      </div>
      <ContextTip id="resume" title="Your place, kept safe">
        Answers save automatically after a brief pause. Wait for “Your place is saved” before
        closing. The close button saves before leaving. Resume the same session on this account,
        even on another day.
      </ContextTip>
      {kind === 'review' &&
        weakSkills(state.words.find((w) => w.word === word.word)).length > 0 && (
          <p className="notice">
            Extra practice for{' '}
            {weakSkills(state.words.find((w) => w.word === word.word)).join(', ')} based on recent
            answers. Recall still comes first.
          </p>
        )}
      {draft.mixed && (
        <p className="notice">
          {current === 'Discover'
            ? 'Meet every new word first. Mixed exercises come next.'
            : `Mixed practice · ${words.length} words, including earlier lessons. Tricky skills get extra practice.`}
        </p>
      )}
      {draft.mixed && (
        <ContextTip
          key={current === 'Discover' ? 'teach-first' : 'mixed-practice'}
          id={current === 'Discover' ? 'teach-first' : 'mixed-practice'}
          title={
            current === 'Discover'
              ? 'Meet the words before testing yourself'
              : 'Connect your growing vocabulary'
          }
        >
          {current === 'Discover'
            ? 'Read the meaning and examples for every new word first. Open the mini-scene for another way to picture it.'
            : 'Exercises switch between your new and previously learned words. Recent mistakes add targeted questions. You can pause at any point; the same order and answers will resume.'}
        </ContextTip>
      )}
      <div className="lesson-top">
        <button
          className="icon-button"
          aria-label="Leave session"
          disabled={busy}
          onClick={async () => {
            if (await savePlace()) router.push(kind === 'learn' ? '/' : '/review');
          }}
        >
          <X size={22} />
        </button>
        <div
          className="progress-track"
          role="progressbar"
          aria-label="Lesson progress"
          aria-valuenow={draft.mixed?.cursor ?? index * activeSteps.length + step}
          aria-valuemin={0}
          aria-valuemax={draft.mixed?.queue.length ?? words.length * activeSteps.length}
        >
          <span
            style={{
              width: `${((draft.mixed?.cursor ?? index * activeSteps.length + step) / (draft.mixed?.queue.length ?? words.length * activeSteps.length)) * 100}%`,
            }}
          />
        </div>
        <span>
          {index + 1} / {words.length}
        </span>
      </div>
      <div className="lesson-card panel" ref={card} tabIndex={-1}>
        <p className="eyebrow">
          {String(step + 1).padStart(2, '0')} / {activeSteps.length} · {current}
        </p>
        {current === 'Discover' && (
          <>
            <div className="lesson-word">
              <h1>{word.word}</h1>
              <button
                className="icon-button"
                aria-label="Play pronunciation"
                onClick={() => {
                  if ('speechSynthesis' in window) {
                    const utterance = new SpeechSynthesisUtterance(word.word);
                    utterance.lang = 'en-US';
                    speechSynthesis.speak(utterance);
                  }
                }}
              >
                <Volume2 size={25} />
              </button>
            </div>
            <p className="word-meta">
              {word.partOfSpeech} · {word.difficulty} {word.pronunciation}
            </p>
            <p className="definition">{word.meanings[0].definition}</p>
            <blockquote>{word.meanings[0].examples[0]}</blockquote>
            <ScreenScene word={word} />
            <div className="memory-hook">
              <Lightbulb size={23} />
              <p>{word.meanings[0].simple}</p>
            </div>
          </>
        )}
        {isChoice && (
          <>
            <h2>{exercise.prompt}</h2>
            <div className="answer-options">
              {exercise.options.map((option, i) => (
                <button
                  key={option}
                  disabled={checked}
                  className={
                    (answer === i ? 'selected ' : '') +
                    (checked && i === exercise.answer ? 'correct' : '')
                  }
                  aria-pressed={answer === i}
                  onClick={() => setAnswer(i)}
                >
                  <span>{String.fromCharCode(65 + i)}</span>
                  {option}
                  {checked && i === exercise.answer && <Check size={19} />}
                </button>
              ))}
            </div>
          </>
        )}
        {isRecall && (
          <>
            <h2>{typedContext ? 'Complete the thought.' : 'Which word comes to mind?'}</h2>
            <p className="recall-definition">
              {typedContext ? exercise.prompt : word.meanings[0].definition}
            </p>
            <label>
              Type the word
              <input
                autoComplete="off"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                maxLength={2000}
                value={text}
                disabled={checked}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && text.trim() && !checked) check();
                }}
                placeholder="Take your time…"
              />
            </label>
          </>
        )}
        {isProduce && (
          <>
            <h2>Make it part of your life.</h2>
            <p>
              Write a sentence using <strong>{word.word}</strong> about something you’ve
              experienced.
            </p>
            <div className="simple-meaning">
              <span>A useful pattern</span>
              <p>{word.patterns[0]}</p>
            </div>
            <label>
              Your own sentence
              <textarea
                value={sentence}
                onChange={(e) => setSentence(e.target.value)}
                placeholder={`I… ${word.word}…`}
                maxLength={2000}
              />
            </label>
            <p className="tiny">
              Saved privately. This exercise is self-assessed, so take a moment to compare your
              usage with the pattern.
            </p>
          </>
        )}
        {current === 'Recap' && (
          <ContextTip id="confidence" title="Rate recall, not perfection">
            “I can use it” means you could choose this word naturally in a conversation. Your
            answers and confidence schedule your next review; confidence alone is not proof of
            lasting memory.
          </ContextTip>
        )}
        {current === 'Recap' && (
          <>
            <h2>{word.word}, in your words.</h2>
            <p className="definition">{word.meanings[0].definition}</p>
            <code>{word.patterns[0]}</code>
            <div className="memory-hook">
              <Lightbulb size={23} />
              <p>{word.memoryHook}</p>
            </div>
            <fieldset className="confidence">
              <legend>How well do you know it now?</legend>
              {[
                'I don’t know it',
                'I recognize it',
                'I mostly know it',
                'I can use it',
                'I know it well',
              ].map((label, i) => (
                <label key={label}>
                  <input
                    type="radio"
                    name="confidence"
                    checked={confidence === i}
                    onChange={() => setConfidence(i)}
                  />
                  {label}
                </label>
              ))}
            </fieldset>
          </>
        )}
        {checked && (
          <div role="status" className={'answer-feedback ' + (correct ? 'success' : 'retry')}>
            <strong>{correct ? 'That’s it. Nicely done.' : 'A useful one to revisit.'}</strong>
            <p>
              {isChoice
                ? exercise.explanation
                : `The word is “${word.word}”: ${word.meanings[0].definition}.`}
            </p>
            {!correct && (
              <>
                <span>We’ll bring this word back sooner.</span>
                <blockquote>
                  {word.meanings[0].examples[1] ?? word.meanings[0].examples[0]}
                </blockquote>
              </>
            )}
          </div>
        )}
      </div>
      <div className="lesson-controls">
        <span>
          {current === 'Recap' ? 'One small step, made to last.' : 'No rush. You’re here to learn.'}
        </span>
        {(isChoice || isRecall) && !checked ? (
          <button
            className="button"
            disabled={isChoice ? answer === null : !text.trim()}
            onClick={check}
          >
            Check answer
            <Check size={18} />
          </button>
        ) : (
          <button
            className="button"
            disabled={
              busy ||
              (isProduce &&
                (!(' ' + sentence.toLowerCase().replace(/[^a-z' -]/g, ' ') + ' ').includes(
                  ' ' + word.word.toLowerCase() + ' ',
                ) ||
                  sentence.trim().split(/\s+/).length < 4))
            }
            onClick={() => void next()}
          >
            {current === 'Recap' ? 'Save & continue' : 'Continue'}
            <ArrowRight size={18} />
          </button>
        )}
      </div>
    </div>
  );
}
