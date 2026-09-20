import { timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { failure, readJson } from '@/lib/http';
import { sendSignupNotification } from '@/lib/signup-notifications';

const webhookPayload = z.object({
  type: z.literal('INSERT'),
  table: z.literal('signup_events'),
  schema: z.literal('public'),
  record: z.object({ user_id: z.uuid() }),
});

function authorized(request: Request) {
  const expected = process.env.SIGNUP_WEBHOOK_SECRET;
  const received = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!expected || !received) return false;
  const left = Buffer.from(expected);
  const right = Buffer.from(received);
  return left.length === right.length && timingSafeEqual(left, right);
}

export async function POST(request: Request) {
  if (!authorized(request))
    return NextResponse.json(
      { error: 'Webhook authorization failed.' },
      { status: 401, headers: { 'Cache-Control': 'no-store' } },
    );
  try {
    const payload = webhookPayload.parse(await readJson(request, 32_000));
    const result = await sendSignupNotification(payload.record.user_id);
    return NextResponse.json({ ok: true, result }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return failure(error);
  }
}
