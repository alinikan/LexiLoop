import 'server-only';
import { cambridgeProvider } from './cambridge';
import type { DictionaryProvider } from './types';
export function dictionaryProvider(): DictionaryProvider {
  return cambridgeProvider;
}
