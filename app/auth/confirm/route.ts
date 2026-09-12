import { NextResponse } from 'next/server';
import { userClient } from '@/lib/db/server';
export async function GET(request: Request) {
  const url = new URL(request.url);
  const origin = process.env.NEXT_PUBLIC_APP_URL || url.origin;
  const next = url.searchParams.get('next') === '/reset-password' ? '/reset-password' : '/';
  try {
    const db = await userClient();
    const code = url.searchParams.get('code');
    const token_hash = url.searchParams.get('token_hash');
    const type = url.searchParams.get('type');
    const result = code
      ? await db.auth.exchangeCodeForSession(code)
      : token_hash && (type === 'email' || type === 'signup' || type === 'recovery')
        ? await db.auth.verifyOtp({ token_hash, type })
        : null;
    if (result && !result.error)
      return NextResponse.redirect(new URL(type === 'recovery' ? '/reset-password' : next, origin));
  } catch {
    /* Never expose tokens or provider messages in redirects. */
  }
  return NextResponse.redirect(new URL('/login?confirmation=failed', origin));
}
