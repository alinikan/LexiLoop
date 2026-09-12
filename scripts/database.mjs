import { readFile, readdir } from 'node:fs/promises';
import { Client } from 'pg';
import { spawnSync } from 'node:child_process';
try {
  process.loadEnvFile('.env.local');
} catch {
  /* CI can provide environment directly. */
}
if (!process.env.DATABASE_URL)
  throw new Error('Set DATABASE_URL in .env.local to your Supabase PostgreSQL connection string.');
const client = new Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
try {
  if (process.argv[2] === 'migrate') {
    await client.query(
      'create table if not exists public.lexiloop_migrations(name text primary key, applied_at timestamptz default now())',
    );
    await client.query("select pg_advisory_lock(hashtext('lexiloop_migrations'))");
    for (const file of (await readdir('supabase/migrations'))
      .filter((f) => f.endsWith('.sql'))
      .sort()) {
      const exists = await client.query(
        'select name from public.lexiloop_migrations where name=$1',
        [file],
      );
      if (exists.rowCount) continue;
      const sql = (await readFile(`supabase/migrations/${file}`, 'utf8'))
        .replace(/^\s*begin;/i, '')
        .replace(/commit;\s*$/i, '');
      await client.query('begin');
      try {
        await client.query(sql);
        await client.query('insert into public.lexiloop_migrations(name) values($1)', [file]);
        await client.query('commit');
      } catch (error) {
        await client.query('rollback');
        throw error;
      }
      console.log(`Applied ${file}`);
    }
  } else if (process.argv[2] === 'seed') {
    const result = spawnSync(process.execPath, ['--import', 'tsx', 'scripts/seed-data.ts'], {
      encoding: 'utf8',
    });
    if (result.status !== 0) throw new Error(result.stderr);
    const words = JSON.parse(result.stdout);
    for (const word of words)
      await client.query('select public.cache_lexical_word($1::jsonb)', [JSON.stringify(word)]);
    console.log(`Seeded ${words.length} original word lessons.`);
  } else throw new Error('Use migrate or seed.');
} finally {
  await client.end();
}
