import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';

export async function migrate(client, directory = 'supabase/migrations') {
  await client.query("select pg_advisory_lock(hashtext('lexiloop_migrations'))");
  try {
    await client.query(
      'create table if not exists public.lexiloop_migrations(name text primary key, applied_at timestamptz default now())',
    );
    const applied = [];
    for (const file of (await readdir(directory)).filter((f) => f.endsWith('.sql')).sort()) {
      const exists = await client.query(
        'select name from public.lexiloop_migrations where name=$1',
        [file],
      );
      if (exists.rows.length) continue;
      const sql = (await readFile(join(directory, file), 'utf8'))
        .replace(/^\s*begin;/i, '')
        .replace(/commit;\s*$/i, '');
      await client.query('begin');
      try {
        await client.query(sql);
        await client.query('insert into public.lexiloop_migrations(name) values($1)', [file]);
        await client.query('commit');
        applied.push(file);
      } catch (error) {
        await client.query('rollback');
        throw error;
      }
    }
    return applied;
  } finally {
    await client.query("select pg_advisory_unlock(hashtext('lexiloop_migrations'))");
  }
}
