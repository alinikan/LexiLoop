import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireUser, adminClient } from '@/lib/db/server';
import { checkOrigin, failure, readJson } from '@/lib/http';
import { inputWordSchema } from '@/lib/validation/word';
import { dictionaryProvider } from '@/lib/dictionary/provider';
import { cambridgeConfigured } from '@/lib/dictionary/cambridge';
export async function POST(request: Request) {
  try {
    checkOrigin(request);
    const { user } = await requireUser();
    const { word } = z.object({ word: inputWordSchema }).parse(await readJson(request, 1000));
    if (cambridgeConfigured()) {
      const { data, error } = await adminClient().rpc('consume_dictionary_quota', {
        p_user: user.id,
      });
      if (error || !data)
        return NextResponse.json(
          {
            status: 'rate-limited',
            message:
              'Today’s Cambridge lookup limit has been reached. You can still use the Cambridge website.',
          },
          { headers: { 'Cache-Control': 'private, no-store' } },
        );
    }
    return NextResponse.json(await dictionaryProvider().lookup(word), {
      headers: { 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' },
    });
  } catch (error) {
    return failure(error);
  }
}
