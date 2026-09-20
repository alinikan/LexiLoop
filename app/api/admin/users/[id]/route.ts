import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdmin } from '@/lib/admin';
import { adminClient } from '@/lib/db/server';
import { checkOrigin, failure, readJson } from '@/lib/http';
import { UserError } from '@/lib/errors';

const bodySchema = z.object({ email: z.email() });

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    checkOrigin(request);
    const { user } = await requireAdmin();
    const { id } = await context.params;
    const userId = z.uuid().parse(id);
    if (userId === user.id) throw new UserError('You cannot delete the account you are using.');
    const body = bodySchema.parse(await readJson(request));
    const db = adminClient();
    const { data, error: readError } = await db.auth.admin.getUserById(userId);
    if (readError || !data.user) throw new UserError('That account no longer exists.');
    if (data.user.email?.toLowerCase() !== body.email.toLowerCase())
      throw new UserError('Type the complete account email to confirm deletion.');
    const { error } = await db.auth.admin.deleteUser(userId);
    if (error) throw new UserError('The account could not be deleted.');
    return NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return failure(error);
  }
}
