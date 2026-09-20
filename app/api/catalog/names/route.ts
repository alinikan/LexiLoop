import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/db/server';
import { failure } from '@/lib/http';
import { UserError } from '@/lib/errors';

export async function GET() {
  try {
    const { db } = await requireUser();
    const names: string[] = [];
    for (let offset = 0; ; offset += 1000) {
      const { data, error } = await db
        .from('words')
        .select('word')
        .eq('published', true)
        .order('word')
        .range(offset, offset + 999);
      if (error) throw new UserError('The vocabulary index could not be loaded.');
      names.push(...(data ?? []).map((row) => row.word));
      if (!data || data.length < 1000) break;
    }
    return NextResponse.json(
      { names },
      { headers: { 'Cache-Control': 'private, max-age=3600, stale-while-revalidate=86400' } },
    );
  } catch (error) {
    return failure(error);
  }
}
