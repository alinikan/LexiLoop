import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireUser } from '@/lib/db/server';
import { comparableWord } from '@/lib/validation/word';
import { failure } from '@/lib/http';
import { UserError } from '@/lib/errors';

const querySchema = z.object({
  q: z.string().max(60).default(''),
  level: z.enum(['A2', 'B1', 'B2', 'C1']).optional(),
  category: z.enum(['Everyday', 'Workplace', 'Academic', 'Conversation', 'Reading']).optional(),
  offset: z.coerce.number().int().min(0).max(10_000).default(0),
  limit: z.coerce.number().int().min(1).max(48).default(24),
});

export async function GET(request: Request) {
  try {
    const { db } = await requireUser();
    const url = new URL(request.url);
    const input = querySchema.parse(Object.fromEntries(url.searchParams));
    const normalized = comparableWord(input.q);
    if (normalized && !/^[\p{L}' -]+$/u.test(normalized))
      throw new UserError('Search using letters, spaces, apostrophes, or hyphens.');
    let query = db
      .from('words')
      .select('word,part_of_speech,difficulty,usefulness,categories,definition,frequency_rank', {
        count: 'exact',
      })
      .eq('published', true);
    if (normalized) query = query.ilike('normalized_word', `%${normalized}%`);
    if (input.level) query = query.eq('difficulty', input.level);
    if (input.category) query = query.contains('categories', [input.category]);
    const { data, count, error } = await query
      .order('usefulness', { ascending: false })
      .order('frequency_rank', { ascending: true, nullsFirst: false })
      .order('word')
      .range(input.offset, input.offset + input.limit - 1);
    if (error)
      throw new UserError(
        'The vocabulary library could not be searched. Apply the latest migration and seed.',
      );
    return NextResponse.json(
      {
        items: (data ?? []).map((row) => ({
          word: row.word,
          partOfSpeech: row.part_of_speech,
          difficulty: row.difficulty,
          usefulness: row.usefulness,
          categories: row.categories,
          definition: row.definition,
        })),
        total: count ?? 0,
        offset: input.offset,
        hasMore: input.offset + (data?.length ?? 0) < (count ?? 0),
      },
      { headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' } },
    );
  } catch (error) {
    return failure(error);
  }
}
