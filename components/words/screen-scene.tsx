import type { Word } from '@/lib/ai/schemas';
/** Original micro-scenes: never presented as quotations from existing productions. */
export function ScreenScene({ word }: { word: Word }) {
  const example = word.meanings[0].examples[1];
  return (
    <details className="screen-scene">
      <summary>Picture it on screen · an original mini-scene</summary>
      <p className="tiny">
        An original fictional scene, not dialogue from a real show, movie, or game.
      </p>
      <p>A character recounts a moment to a friend:</p>
      <blockquote>“{example}”</blockquote>
      <p>
        <strong>What they mean:</strong> Here, <em>{word.word}</em> means{' '}
        {word.meanings[0].simple.replace(/[.!]$/, '').toLowerCase()}.
      </p>
      <p>
        <strong>Make the connection:</strong> {word.scenario}
      </p>
      <p className="tiny">Try retelling this moment using the word in your own conversation.</p>
    </details>
  );
}
