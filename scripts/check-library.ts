import { readFileSync } from 'node:fs';
import { catalog } from '../data/catalog';
import { validateWord } from '../lib/ai/schemas';

type GeneratedRow = {
  source: 'wordnet-wordfreq';
  frequencyRank: number;
  normalizedWord: string;
  content: unknown;
};

const rows = readFileSync('data/library.generated.jsonl', 'utf8')
  .trim()
  .split('\n')
  .map((line, index) => {
    let parsed: GeneratedRow;
    try {
      parsed = JSON.parse(line) as GeneratedRow;
    } catch {
      throw new Error(`Generated library line ${index + 1} is not valid JSON.`);
    }
    if (
      parsed.source !== 'wordnet-wordfreq' ||
      !Number.isInteger(parsed.frequencyRank) ||
      !parsed.normalizedWord
    )
      throw new Error(`Generated library line ${index + 1} has invalid metadata.`);
    return { ...parsed, content: validateWord(parsed.content) };
  });

const words = [...catalog, ...rows.map((row) => row.content)];
const unsafe = /\b(?:fuck|shit|bitch|cunt|motherfuck)\w*\b/i;
for (const word of words) {
  if (unsafe.test(JSON.stringify(word)))
    throw new Error(`Unsafe text found in the lesson for “${word.word}”.`);
}
const duplicates = words
  .map((word) => word.word)
  .filter((word, index, all) => all.indexOf(word) !== index);
if (words.length !== 5000) throw new Error(`Expected 5,000 words; found ${words.length}.`);
if (duplicates.length) throw new Error(`Duplicate words: ${[...new Set(duplicates)].join(', ')}`);

const levels = Object.fromEntries(
  ['A2', 'B1', 'B2', 'C1'].map((level) => [
    level,
    words.filter((word) => word.difficulty === level).length,
  ]),
);
const expected = { A2: 300, B1: 1200, B2: 2000, C1: 1500 };
if (JSON.stringify(levels) !== JSON.stringify(expected))
  throw new Error(`Unexpected level distribution: ${JSON.stringify(levels)}.`);

console.log(
  `Validated ${words.length.toLocaleString()} unique lessons (${Object.entries(levels)
    .map(([level, count]) => `${level}: ${count}`)
    .join(', ')}).`,
);
