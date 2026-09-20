import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/db/server';
import { failure } from '@/lib/http';
import { UserError } from '@/lib/errors';
import { comparableWord } from '@/lib/validation/word';
import { validateWord } from '@/lib/ai/schemas';

export async function GET(_request: Request, context: { params: Promise<{ word: string }> }) {
  try {
    const { db } = await requireUser();
    const { word } = await context.params;
    const normalized = comparableWord(decodeURIComponent(word));
    if (!normalized || normalized.length > 60) throw new UserError('Choose a valid word.');
    const { data, error } = await db
      .from('words')
      .select('content')
      .eq('normalized_word', normalized)
      .eq('published', true)
      .limit(1)
      .maybeSingle();
    if (error) throw new UserError('The word could not be loaded. Please retry.');
    if (!data) throw new UserError('That word is not in the LexiLoop library.');
    return NextResponse.json(
      { word: validateWord(data.content) },
      { headers: { 'Cache-Control': 'private, max-age=3600, stale-while-revalidate=86400' } },
    );
  } catch (error) {
    return failure(error);
  }
}
