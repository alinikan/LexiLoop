'use client';
import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { ArrowRight, Check, Volume2, Lightbulb, Trophy, X } from 'lucide-react';
import { useStore } from '../store';
import { todaySet } from '@/lib/domain';
import type { Word } from '@/lib/ai/schemas';
const steps = [
  'Discover',
  'Understand',
  'Context',
  'Distinguish',
  'Recall',
  'Make it yours',
  'Apply',
  'Recap',
];
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
  const [lessonDay] = useState(() => todaySet(state).date);
  const [index, setIndex] = useState(0),
    [step, setStep] = useState(0),
    [answer, setAnswer] = useState<number | null>(null),
    [text, setText] = useState(''),
    [sentence, setSentence] = useState(''),
    [checked, setChecked] = useState(false),
    [mistakes, setMistakes] = useState(0),
    [confidence, setConfidence] = useState(2),
    [done, setDone] = useState(false),
    [id, setId] = useState(() => crypto.randomUUID());
  const card = useRef<HTMLDivElement>(null);
  useEffect(() => {
    card.current?.focus();
  }, [step, index]);
  const word = words[index];
  const activeSteps = kind === 'learn' ? steps : ['Recall', 'Context', 'Recap'];
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
    setChecked(true);
    if (!correct) setMistakes((m) => m + 1);
  }
  async function next() {
    if (step === activeSteps.length - 1) {
      const quality = mistakes > 0 ? 0 : confidence <= 1 ? 1 : confidence === 4 ? 3 : 2;
      if (
        !(await dispatch({
          type: 'complete',
          word: word.word,
          quality,
          confidence,
          day: kind === 'learn' ? lessonDay : undefined,
          kind,
          sentence,
          id,
        }))
      )
        return;
      if (index === words.length - 1) {
        setDone(true);
        return;
      }
      setIndex(index + 1);
      setStep(0);
      setSentence('');
      setMistakes(0);
      setConfidence(2);
      setId(crypto.randomUUID());
    } else setStep(step + 1);
    setChecked(false);
    setAnswer(null);
    setText('');
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
          {words.length * (kind === 'learn' ? 20 : 10)} XP.
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
      <div className="lesson-top">
        <Link
          href={kind === 'learn' ? '/' : '/review'}
          className="icon-button"
          aria-label="Leave session"
        >
          <X size={22} />
        </Link>
        <div
          className="progress-track"
          role="progressbar"
          aria-label="Lesson progress"
          aria-valuenow={index * activeSteps.length + step}
          aria-valuemin={0}
          aria-valuemax={words.length * activeSteps.length}
        >
          <span
            style={{
              width: `${((index * activeSteps.length + step) / (words.length * activeSteps.length)) * 100}%`,
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
            {step === activeSteps.length - 1 ? 'Save & continue' : 'Continue'}
            <ArrowRight size={18} />
          </button>
        )}
      </div>
    </div>
  );
}
