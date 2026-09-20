import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin';
import { checkOrigin, failure } from '@/lib/http';
import { pendingSignupNotifications, sendSignupNotification } from '@/lib/signup-notifications';

export async function GET() {
  try {
    await requireAdmin();
    const pending = await pendingSignupNotifications();
    return NextResponse.json(pending, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    return failure(error);
  }
}

export async function POST(request: Request) {
  try {
    checkOrigin(request);
    await requireAdmin();
    const pending = await pendingSignupNotifications(10);
    let sent = 0;
    let failed = 0;
    for (const event of pending.events) {
      try {
        if ((await sendSignupNotification(event.user_id)) === 'sent') sent++;
      } catch {
        failed++;
      }
    }
    return NextResponse.json(
      { sent, failed, remaining: Math.max(0, pending.total - sent) },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (error) {
    return failure(error);
  }
}
