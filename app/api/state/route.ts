import { UserError } from '@/lib/errors';
import { z } from 'zod';
import { NextResponse } from 'next/server';
import { readState, commitState } from '@/lib/db/state';
import { applyCommand } from '@/lib/domain';
import { commandSchema } from '@/lib/validation/commands';
import { checkOrigin, failure, readJson } from '@/lib/http';
import { adminClient } from '@/lib/db/server';
import { validateWord } from '@/lib/ai/schemas';
export const dynamic = 'force-dynamic';
export async function GET() {
  try {
    return NextResponse.json(await readState(), {
      headers: { 'Cache-Control': 'private, no-store' },
    });
  } catch (error) {
    return failure(error);
  }
}
export async function POST(request: Request) {
  try {
    checkOrigin(request);
    if (Number(request.headers.get('content-length')) > 8000000)
      throw new UserError('This request is too large.');
    const body = z
      .object({ version: z.number().int().nonnegative(), command: z.unknown() })
      .parse(await readJson(request, 8000000));
    const command = commandSchema.parse(body.command);
    const current = await readState();
    if (body.version !== current.state.version)
      throw new UserError('Your progress changed in another tab. Reload and try again.');
    if (command.type === 'save' && !current.catalog.some((w) => w.word === command.word)) {
      const { data } = await adminClient()
        .from('words')
        .select('content')
        .eq('word', command.word)
        .maybeSingle();
      if (data) current.catalog.push(validateWord(data.content));
    }
    if (command.type === 'complete') {
      const { data: previous, error } = await adminClient()
        .from('review_events')
        .select('id')
        .eq('user_id', current.userId)
        .eq('id', command.id)
        .maybeSingle();
      if (error) throw new UserError('Previous progress could not be checked. Please retry.');
      if (previous)
        return NextResponse.json(
          { state: current.state },
          { headers: { 'Cache-Control': 'no-store' } },
        );
    }
    const state = applyCommand(current.state, command, current.catalog);
    await commitState(current.userId, current.state, state);
    const refreshed = await readState();
    return NextResponse.json(
      { state: refreshed.state },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (error) {
    return failure(error);
  }
}
