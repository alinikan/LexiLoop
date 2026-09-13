import { UserError } from '@/lib/errors';
import { z } from 'zod';
import { NextResponse } from 'next/server';
import { catalog } from '@/data/catalog';
import { inputWordSchema } from '@/lib/validation/word';
import { getProvider } from '@/lib/ai/provider';
import { validateWord } from '@/lib/ai/schemas';
import { cacheWord } from '@/lib/db/state';
import { requireUser, adminClient } from '@/lib/db/server';
import { checkOrigin, failure, readJson } from '@/lib/http';
export const maxDuration = 90;
export async function POST(request: Request) {
  try {
    checkOrigin(request);
    const { user } = await requireUser();
    if (Number(request.headers.get('content-length')) > 1000)
      throw new UserError('Please enter just the word.');
    const { word } = z.object({ word: inputWordSchema }).parse(await readJson(request, 1000));
    const seed = catalog.find((w) => w.word === word);
    if (seed)
      return NextResponse.json({ word: seed }, { headers: { 'Cache-Control': 'no-store' } });
    const db = adminClient();
    const { data: alias, error: aliasError } = await db
      .from('word_aliases')
      .select('word')
      .eq('alias', word)
      .maybeSingle();
    if (aliasError)
      throw new UserError('Word storage is unavailable. Check that migrations are applied.');
    const { data: cached, error } = await db
      .from('words')
      .select('content')
      .eq('word', alias?.word ?? word)
      .maybeSingle();
    if (error) throw new UserError('Word storage is unavailable. Please try again.');
    if (cached)
      return NextResponse.json(
        { word: validateWord(cached.content) },
        { headers: { 'Cache-Control': 'no-store' } },
      );
    const token = crypto.randomUUID();
    const { data: claimed, error: claimError } = await db.rpc('claim_word_generation', {
      p_word: word,
      p_token: token,
    });
    if (claimError) throw new UserError('Word storage is unavailable. Please try again.');
    if (!claimed)
      return NextResponse.json(
        { error: 'This word is being prepared. Try again in a moment.' },
        { status: 409, headers: { 'Retry-After': '10', 'Cache-Control': 'no-store' } },
      );
    try {
      // A previous lease owner may have finished between our first read and claim.
      const { data: freshAlias, error: freshAliasError } = await db
        .from('word_aliases')
        .select('word')
        .eq('alias', word)
        .maybeSingle();
      if (freshAliasError) throw new UserError('Word storage is unavailable. Please retry.');
      const { data: fresh, error: freshError } = await db
        .from('words')
        .select('content')
        .eq('word', freshAlias?.word ?? word)
        .maybeSingle();
      if (freshError) throw new UserError('Word storage is unavailable. Please retry.');
      if (fresh)
        return NextResponse.json(
          { word: validateWord(fresh.content) },
          { headers: { 'Cache-Control': 'no-store' } },
        );
      const { data: allowed, error: rateError } = await db.rpc('consume_generation_quota', {
        p_user: user.id,
      });
      if (rateError)
        throw new UserError('Word generation limits could not be checked. Please try again.');
      if (!allowed)
        throw new UserError(
          'You have reached today’s 20 new word generations. Try a saved or suggested word, or come back tomorrow.',
        );
      const provider = await getProvider();
      const generated = await provider.generate(word);
      generated.word = inputWordSchema.parse(generated.word);
      const persisted = await cacheWord(generated, word);
      return NextResponse.json({ word: persisted }, { headers: { 'Cache-Control': 'no-store' } });
    } finally {
      await db.rpc('release_word_generation', { p_word: word, p_token: token });
    }
  } catch (error) {
    return failure(error);
  }
}
