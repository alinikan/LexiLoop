'use client';
import { CambridgeLink } from './cambridge-link';
import { Volume2, Lightbulb } from 'lucide-react';
import type { Word } from '@/lib/ai/schemas';
import { displayRegister } from '@/lib/word-content';
export function WordDetail({ word }: { word: Word }) {
  return (
    <div className="word-detail">
      <div className="detail-heading">
        <div>
          <span className="eyebrow">
            {word.categories.join(' / ')} · {word.difficulty}
          </span>
          <h2>{word.word}</h2>
          <p>
            {word.partOfSpeech}
            {word.pronunciation && ` · ${word.pronunciation}`}
          </p>
        </div>
        <button
          className="icon-button sound"
          aria-label={`Pronounce ${word.word}`}
          onClick={() => {
            if ('speechSynthesis' in window) {
              window.speechSynthesis.cancel();
              const speech = new SpeechSynthesisUtterance(word.word);
              speech.lang = 'en-US';
              speech.rate = 0.85;
              window.speechSynthesis.speak(speech);
            }
          }}
        >
          <Volume2 size={23} />
        </button>
      </div>
      {word.sensitive && (
        <p className="notice">
          Sensitive language: check the usage guidance before using this term.
        </p>
      )}
      <span className="word-meta">{displayRegister(word)}</span>
      {word.meanings.map((meaning, i) => (
        <section key={i}>
          <h3>
            {word.meanings.length > 1
              ? `Our explanation · Meaning ${i + 1}`
              : 'Our Simple Explanation'}
          </h3>
          <p className="definition">{meaning.definition}</p>
          <div className="simple-meaning">
            <span>In simple words</span>
            <p>{meaning.simple}</p>
          </div>
          <h3>Out in the real world</h3>
          {meaning.examples.map((ex) => (
            <blockquote key={ex}>{ex}</blockquote>
          ))}
        </section>
      ))}
      <section>
        <h3>A real-life situation</h3>
        <p>{word.scenario}</p>
      </section>
      <div className="detail-columns">
        <section>
          <h3>When to use it</h3>
          <p>{word.whenToUse}</p>
        </section>
        <section>
          <h3>Watch out for</h3>
          <p>{word.commonMistake}</p>
        </section>
      </div>
      {word.synonyms.length > 0 && (
        <section>
          <h3>Close, but different</h3>
          {word.synonyms.map((s) => (
            <p key={s.word}>
              <strong>
                {word.word} / {s.word}
              </strong>
              <br />
              {s.distinction}
            </p>
          ))}
        </section>
      )}
      <div className="detail-columns">
        <section>
          {word.collocations.length > 0 && <h3>Common combinations</h3>}
          {word.collocations.map((c) => (
            <p key={c}>{c}</p>
          ))}
          <h3>Sentence patterns</h3>
          {word.patterns.map((p) => (
            <code key={p}>{p}</code>
          ))}
        </section>
        <section>
          <h3>Word family</h3>
          <p>{word.family.join(' · ') || 'No common related forms.'}</p>
          <h3>Opposites</h3>
          <p>{word.antonyms.join(' · ') || 'No useful direct opposite for this meaning.'}</p>
        </section>
      </div>
      <div className="memory-hook">
        <Lightbulb size={22} />
        <p>{word.memoryHook}</p>
      </div>
      <CambridgeLink word={word.word} />
    </div>
  );
}
