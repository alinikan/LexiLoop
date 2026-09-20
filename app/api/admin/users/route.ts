import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdmin } from '@/lib/admin';
import { adminClient } from '@/lib/db/server';
import { failure } from '@/lib/http';
import { UserError } from '@/lib/errors';

const querySchema = z.object({ page: z.coerce.number().int().min(1).max(10_000).default(1) });

export async function GET(request: Request) {
  try {
    await requireAdmin();
    const input = querySchema.parse(Object.fromEntries(new URL(request.url).searchParams));
    const { data, error } = await adminClient().auth.admin.listUsers({
      page: input.page,
      perPage: 50,
    });
    if (error) throw new UserError('Accounts could not be loaded from Supabase Auth.');
    return NextResponse.json(
      {
        users: data.users.map((user) => ({
          id: user.id,
          email: user.email ?? 'No email',
          displayName:
            typeof user.user_metadata?.display_name === 'string'
              ? user.user_metadata.display_name
              : '',
          confirmedAt: user.email_confirmed_at ?? null,
          createdAt: user.created_at,
          lastSignInAt: user.last_sign_in_at ?? null,
        })),
        page: input.page,
        nextPage: data.nextPage,
        lastPage: data.lastPage || 1,
        total: data.total || data.users.length,
      },
      { headers: { 'Cache-Control': 'private, no-store' } },
    );
  } catch (error) {
    return failure(error);
  }
}
