import { UserError } from '@/lib/errors';
import { NextResponse } from 'next/server';
import { userClient } from '@/lib/db/server';
import { checkOrigin, failure, readJson } from '@/lib/http';
import { authSchema } from '@/lib/validation/auth';
export async function POST(request: Request) {
  try {
    checkOrigin(request);
    const body = authSchema.parse(await readJson(request, 4000));
    const db = await userClient();
    const respond = (data: object) =>
      NextResponse.json(data, { headers: { 'Cache-Control': 'no-store' } });
    if (body.action === 'signout') {
      const { error } = await db.auth.signOut();
      if (error) throw new UserError('Sign-out failed. Please try again.');
      return respond({ ok: true });
    }
    if (body.action === 'reset') {
      const {
        data: { user },
        error: sessionError,
      } = await db.auth.getUser();
      if (sessionError || !user)
        throw new UserError('Please sign in or request a new password reset link.');
      const { error } = await db.auth.updateUser({ password: body.password });
      if (error)
        throw new UserError(
          'The password could not be changed. Use a different password or request a new reset link.',
        );
      const { error: signOutError } = await db.auth.signOut();
      if (signOutError)
        throw new UserError(
          'Your password changed, but sign-out failed. Please sign out from Settings.',
        );
      return respond({ ok: true, message: 'Password updated. Sign in with your new password.' });
    }
    if (body.action === 'signin') {
      const { error } = await db.auth.signInWithPassword({
        email: body.email,
        password: body.password,
      });
      if (error)
        throw new UserError(
          'Sign-in failed. Check your email and password, and confirm your email if you just registered.',
        );
      return respond({ ok: true });
    }
    const origin = process.env.NEXT_PUBLIC_APP_URL;
    if (!origin)
      throw new UserError('The app URL must be configured before email links are available.');
    if (body.action === 'forgot') {
      const { error } = await db.auth.resetPasswordForEmail(body.email, {
        redirectTo: `${origin}/auth/confirm?next=/reset-password`,
      });
      if (error)
        throw new UserError('We couldn’t request a reset email. Wait a moment and try again.');
      return respond({
        ok: true,
        message:
          'If this email has an account, a password reset link will arrive shortly. Check your spam folder too.',
      });
    }
    const { error } = await db.auth.signUp({
      email: body.email,
      password: body.password,
      options: {
        emailRedirectTo: `${origin}/auth/confirm`,
        data: { display_name: body.displayName },
      },
    });
    if (error)
      throw new UserError(
        'We couldn’t complete registration. Try again shortly, or use password recovery if you already have an account.',
      );
    return respond({ ok: true, confirmation: true });
  } catch (error) {
    return failure(error);
  }
}
