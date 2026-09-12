import { UserError } from './errors';
import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
export function checkOrigin(request: Request) {
  const origin = request.headers.get('origin');
  const expected = process.env.NEXT_PUBLIC_APP_URL
    ? new URL(process.env.NEXT_PUBLIC_APP_URL).origin
    : new URL(request.url).origin;
  if (
    !origin ||
    (origin !== expected &&
      !(process.env.NODE_ENV !== 'production' && origin === new URL(request.url).origin))
  )
    throw new UserError('This request did not come from this app.');
}
export function failure(error: unknown) {
  const message =
    error instanceof ZodError
      ? (error.issues[0]?.message ?? 'Check your input and try again.')
      : error instanceof UserError
        ? error.message
        : 'Something went wrong. Please try again.';
  return NextResponse.json(
    { error: message },
    {
      status: message.includes('sign in') ? 401 : message.includes('another tab') ? 409 : 400,
      headers: { 'Cache-Control': 'no-store' },
    },
  );
}

export async function readJson(request: Request, limit = 16000): Promise<unknown> {
  const reader = request.body?.getReader();
  if (!reader) throw new UserError('Please provide a request body.');
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > limit) {
        await reader.cancel();
        throw new UserError('This request is too large.');
      }
      chunks.push(value);
    }
    const joined = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) {
      joined.set(chunk, offset);
      offset += chunk.length;
    }
    try {
      return JSON.parse(new TextDecoder().decode(joined));
    } catch {
      throw new UserError('Please send valid JSON.');
    }
  } finally {
    reader.releaseLock();
  }
}
