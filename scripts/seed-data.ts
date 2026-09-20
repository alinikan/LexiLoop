import { catalog } from '../data/catalog';
import { readFileSync } from 'node:fs';
import { validateWord } from '../lib/ai/schemas';
import { comparableWord } from '../lib/validation/word';

const editorial = catalog.map((content) => ({
  source: 'editorial',
  frequencyRank: null,
  normalizedWord: comparableWord(content.word),
  content,
}));
const generated = readFileSync('data/library.generated.jsonl', 'utf8')
  .trim()
  .split('\n')
  .map((line) => {
    const row = JSON.parse(line);
    row.content = validateWord(row.content);
    return row;
  });

console.log(JSON.stringify([...editorial, ...generated]));
