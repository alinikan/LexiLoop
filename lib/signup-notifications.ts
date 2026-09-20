import 'server-only';
import { z } from 'zod';
import { adminClient } from '@/lib/db/server';
import { UserError } from '@/lib/errors';

const notificationConfig = z.object({
  RESEND_API_KEY: z.string().min(1),
  SIGNUP_NOTIFICATION_TO: z.email(),
  SIGNUP_NOTIFICATION_FROM: z.string().min(3),
});

function config() {
  const parsed = notificationConfig.safeParse(process.env);
  if (!parsed.success)
    throw new UserError(
      'Signup email delivery is not configured. Add the Resend notification variables.',
    );
  return parsed.data;
}

function escapeHtml(value: string) {
  return value.replace(
    /[&<>'"]/g,
    (character) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character]!,
  );
}

export async function sendSignupNotification(userId: string) {
  const db = adminClient();
  const { data: event, error: eventError } = await db
    .from('signup_events')
    .select('user_id,confirmed_at,notified_at')
    .eq('user_id', userId)
    .maybeSingle();
  if (eventError) throw new UserError('The signup notification queue could not be read.');
  if (!event || event.notified_at) return 'already-sent' as const;

  const { data: claimed, error: claimError } = await db.rpc('claim_signup_notification', {
    p_user: userId,
  });
  if (claimError) throw new UserError('The signup notification could not be claimed.');
  if (!claimed) return 'already-processing' as const;

  try {
    const settings = config();
    const { data, error } = await db.auth.admin.getUserById(userId);
    if (error || !data.user?.email)
      throw new Error('The confirmed account email could not be read.');
    const email = data.user.email;
    const displayName =
      typeof data.user.user_metadata?.display_name === 'string'
        ? data.user.user_metadata.display_name
        : '';
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${settings.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
        'Idempotency-Key': `lexiloop-signup-${userId}`,
      },
      body: JSON.stringify({
        from: settings.SIGNUP_NOTIFICATION_FROM,
        to: [settings.SIGNUP_NOTIFICATION_TO],
        subject: 'A new learner joined LexiLoop',
        html: `<h1>New confirmed signup</h1><p><strong>Email:</strong> ${escapeHtml(email)}</p>${
          displayName ? `<p><strong>Name:</strong> ${escapeHtml(displayName)}</p>` : ''
        }<p><strong>Confirmed:</strong> ${escapeHtml(event.confirmed_at)}</p><p><strong>User ID:</strong> ${escapeHtml(userId)}</p>`,
        text: `New confirmed LexiLoop signup\nEmail: ${email}${
          displayName ? `\nName: ${displayName}` : ''
        }\nConfirmed: ${event.confirmed_at}\nUser ID: ${userId}`,
      }),
    });
    if (!response.ok) throw new Error(`Email provider returned ${response.status}.`);
    const { error: updateError } = await db
      .from('signup_events')
      .update({ notified_at: new Date().toISOString(), processing_at: null, last_error: null })
      .eq('user_id', userId);
    if (updateError) throw new Error('Delivery could not be recorded.');
    return 'sent' as const;
  } catch (error) {
    const message =
      error instanceof Error ? error.message.slice(0, 300) : 'Unknown delivery error.';
    await db
      .from('signup_events')
      .update({ processing_at: null, last_error: message })
      .eq('user_id', userId);
    throw new UserError('Signup notification delivery failed. It remains queued for retry.');
  }
}

export async function pendingSignupNotifications(limit = 20) {
  const { data, error, count } = await adminClient()
    .from('signup_events')
    .select('user_id,confirmed_at,attempts,last_error', { count: 'exact' })
    .is('notified_at', null)
    .order('confirmed_at')
    .limit(limit);
  if (error) throw new UserError('The signup notification queue could not be read.');
  return { events: data ?? [], total: count ?? 0 };
}
