export type DictionaryEntry = {
  dictionaryCode: string;
  entryId: string;
  entryLabel: string;
  entryUrl: string;
  entryContent: string;
  format: 'html';
};
export type DictionaryResult =
  | {
      status: 'available';
      entry: DictionaryEntry;
      pronunciations?: { lang: 'uk' | 'us'; pronunciationUrl: string }[];
    }
  | { status: 'unconfigured' | 'unavailable' | 'not-found' | 'rate-limited'; message: string };
export interface DictionaryProvider {
  lookup(word: string): Promise<DictionaryResult>;
}
export const cambridgeLink = (word: string) =>
  `https://dictionary.cambridge.org/dictionary/english/${encodeURIComponent(word.trim().toLowerCase().replaceAll(' ', '-'))}`;
