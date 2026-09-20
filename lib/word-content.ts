import type { Word } from './ai/schemas';

const danglingEnding = /\b(?:and|as|because|but|for|if|of|or|so|that|the|to|when|while|with)$/i;

/** Older generated cards used a 120-character register limit, which could end mid-sentence. */
export function displayRegister(word: Word) {
  const text = word.register.trim();
  if (text.length < 110 || !danglingEnding.test(text)) return text;
  const complete = text.match(/^.*[.!?](?=\s|$)/)?.[0];
  return complete?.trim() || 'Usage varies by context; review the examples before using this word.';
}
