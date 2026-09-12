import { UserError } from '@/lib/errors';
import { NextResponse } from 'next/server';
import { readState } from '@/lib/db/state';
import { requireUser } from '@/lib/db/server';
import { failure } from '@/lib/http';
export async function GET() {
  try {
    const { db, user } = await requireUser();
    const snapshot = await readState();
    if (snapshot.userId !== user.id) throw new UserError('Please sign in again.');
    for (const [table, key, order] of [
      ['review_events', 'events', 'reviewed_at'],
      ['daily_word_sets', 'days', 'day'],
    ] as const) {
      const rows = [];
      for (let offset = 0; ; offset += 500) {
        const { data, error } = await db
          .from(table)
          .select('data')
          .eq('user_id', user.id)
          .order(order)
          .range(offset, offset + 499);
        if (error) throw new UserError('Export could not be completed. Please try again.');
        rows.push(...(data ?? []).map((row) => row.data));
        if (!data || data.length < 500) break;
      }
      snapshot.state[key] = rows;
    }
    return NextResponse.json(
      {
        exportedAt: new Date().toISOString(),
        state: snapshot.state,
        lexicalContent: snapshot.catalog.filter((w) =>
          snapshot.state.words.some((s) => s.word === w.word),
        ),
      },
      {
        headers: {
          'Cache-Control': 'private, no-store',
          'Content-Disposition': 'attachment; filename="lexiloop-wordbook.json"',
        },
      },
    );
  } catch (error) {
    return failure(error);
  }
}
