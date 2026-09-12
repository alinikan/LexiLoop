import { z } from 'zod';
export const cambridgeEntrySchema = z.object({
  dictionaryCode: z.string().min(1),
  entryId: z.string().min(1),
  entryLabel: z.string().min(1).max(1000),
  entryUrl: z.url().refine((value) => {
    const url = new URL(value);
    return url.protocol === 'https:' && url.hostname === 'dictionary.cambridge.org';
  }),
  entryContent: z.string().min(1).max(500000),
  format: z.literal('html'),
});

export const pronunciationSchema = z
  .array(
    z.object({
      lang: z.enum(['uk', 'us']),
      pronunciationUrl: z.url().refine((value) => {
        const url = new URL(value);
        return url.protocol === 'https:' && url.hostname === 'dictionary.cambridge.org';
      }),
    }),
  )
  .max(10);
