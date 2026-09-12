import 'server-only';
import { cambridgeEntrySchema, pronunciationSchema } from './schema';
import type { DictionaryProvider } from './types';
export function cambridgeConfigured() {
  return Boolean(
    process.env.CAMBRIDGE_API_KEY &&
    process.env.CAMBRIDGE_DICTIONARY_CODE &&
    process.env.CAMBRIDGE_LICENSE_CONFIRMED === 'true',
  );
}
// Only the official API; no HTML scraping, persistent caching, AI input, or prefetch.
export const cambridgeProvider: DictionaryProvider = {
  async lookup(word) {
    if (!cambridgeConfigured())
      return {
        status: 'unconfigured',
        message: 'Open Cambridge Dictionary to check its definitions and pronunciation.',
      };
    const endpoint = new URL(
      `https://dictionary.cambridge.org/api/v1/dictionaries/${encodeURIComponent(process.env.CAMBRIDGE_DICTIONARY_CODE!)}/search/first`,
    );
    endpoint.searchParams.set('q', word);
    endpoint.searchParams.set('format', 'html');
    try {
      const response = await fetch(endpoint, {
        headers: { accessKey: process.env.CAMBRIDGE_API_KEY!, Accept: 'application/json' },
        cache: 'no-store',
        redirect: 'error',
        signal: AbortSignal.timeout(8000),
      });
      if (response.status === 404)
        return {
          status: 'not-found',
          message:
            'No entry was returned for this word. Try the Cambridge website for related entries.',
        };
      if (response.status === 429)
        return {
          status: 'rate-limited',
          message: 'Cambridge lookup is busy. Please try again later or open its website.',
        };
      if (!response.ok)
        return {
          status: 'unavailable',
          message: 'Cambridge lookup is unavailable right now. Your lesson is still available.',
        };
      const entry = cambridgeEntrySchema.safeParse(await response.json());
      if (!entry.success)
        return {
          status: 'unavailable',
          message:
            'Cambridge returned an entry we could not display. You can open its website instead.',
        };
      let pronunciations: { lang: 'uk' | 'us'; pronunciationUrl: string }[] = [];
      if (process.env.CAMBRIDGE_AUDIO_LICENSE_CONFIRMED === 'true') {
        try {
          const audio = await fetch(
            `https://dictionary.cambridge.org/api/v1/dictionaries/${encodeURIComponent(entry.data.dictionaryCode)}/entries/${encodeURIComponent(entry.data.entryId)}/pronunciations?format=mp3`,
            {
              headers: { accessKey: process.env.CAMBRIDGE_API_KEY!, Accept: 'application/json' },
              cache: 'no-store',
              redirect: 'error',
              signal: AbortSignal.timeout(5000),
            },
          );
          if (audio.ok) {
            const parsed = pronunciationSchema.safeParse(await audio.json());
            if (parsed.success) pronunciations = parsed.data;
          }
        } catch {
          /* Pronunciation failure never hides the dictionary entry. */
        }
      }
      return { status: 'available', entry: entry.data, pronunciations };
    } catch {
      return {
        status: 'unavailable',
        message: 'Cambridge could not be reached. Please try again or open its website.',
      };
    }
  },
};
