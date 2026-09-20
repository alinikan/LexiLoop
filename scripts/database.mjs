import { migrate } from './migrations.mjs';
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
    const applied = await migrate(client);
    console.log(
      applied.length
        ? `Applied ${applied.join(', ')}`
        : 'Database migrations are already up to date.',
    );
  } else if (process.argv[2] === 'seed') {
    const result = spawnSync(process.execPath, ['--import', 'tsx', 'scripts/seed-data.ts'], {
      encoding: 'utf8',
      maxBuffer: 64 * 1024 * 1024,
    });
    if (result.error) throw result.error;
    if (result.status !== 0) throw new Error(result.stderr || 'Library serialization failed.');
    const entries = JSON.parse(result.stdout);
    for (let offset = 0; offset < entries.length; offset += 100)
      await client.query('select public.seed_lexical_batch($1::jsonb)', [
        JSON.stringify(entries.slice(offset, offset + 100)),
      ]);
    console.log(`Seeded ${entries.length} licensed word lessons in database batches.`);
  } else throw new Error('Use migrate or seed.');
} finally {
  await client.end();
}
