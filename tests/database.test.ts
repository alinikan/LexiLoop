import { beforeAll, afterAll, it, expect } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { readFile } from 'node:fs/promises';
import { catalog } from '@/data/catalog';
import { initialState, applyCommand } from '@/lib/domain';
const user = '10000000-0000-4000-8000-000000000001',
  other = '20000000-0000-4000-8000-000000000002';
let db: PGlite;
beforeAll(async () => {
  db = new PGlite();
  await db.exec(
    `create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create table auth.users(id uuid primary key,raw_user_meta_data jsonb default '{}'::jsonb);create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;grant usage on schema auth to authenticated;grant execute on function auth.uid() to authenticated;insert into auth.users(id) values('${user}'),('${other}');`,
  );
  await db.exec(await readFile('supabase/migrations/001_initial.sql', 'utf8'));
  await db.exec(await readFile('supabase/migrations/002_production.sql', 'utf8'));
  for (const word of catalog)
    await db.query('select public.cache_lexical_word($1::jsonb)', [JSON.stringify(word)]);
}, 20000);
afterAll(async () => {
  await db.close();
});
it('migrates and seeds canonical content with normalized meanings and examples', async () => {
  expect((await db.query('select count(*)::int as count from words')).rows).toEqual([
    { count: 20 },
  ]);
  expect((await db.query('select count(*)::int as count from word_examples')).rows).toEqual([
    { count: 40 },
  ]);
  await db.query('select public.cache_lexical_word($1::jsonb)', [JSON.stringify(catalog[0])]);
  expect((await db.query('select count(*)::int as count from words')).rows).toEqual([
    { count: 20 },
  ]);
});
it('commits normalized daily data atomically and rejects stale revisions', async () => {
  const now = new Date('2026-09-12T12:00:00Z');
  let state = initialState();
  state.settings.goal = 1;
  state = applyCommand(
    state,
    { type: 'save', word: 'reluctant', source: 'personal', note: 'Private note' },
    catalog,
    now,
  );
  state = applyCommand(state, { type: 'select', word: 'reluctant' }, catalog, now);
  state = applyCommand(state, { type: 'start' }, catalog, now);
  state = applyCommand(
    state,
    {
      type: 'complete',
      word: 'reluctant',
      quality: 2,
      kind: 'learn',
      sentence: 'I was reluctant to leave.',
      id: '30000000-0000-4000-8000-000000000003',
    },
    catalog,
    now,
  );
  await db.query('select commit_learning_state($1,0,$2::jsonb)', [user, JSON.stringify(state)]);
  expect((await db.query('select completed from daily_word_set_items')).rows).toEqual([
    { completed: true },
  ]);
  expect((await db.query('select quality from review_events')).rows).toEqual([{ quality: 2 }]);
  await expect(
    db.query('select commit_learning_state($1,0,$2::jsonb)', [user, JSON.stringify(state)]),
  ).rejects.toThrow('revision_conflict');
  expect((await db.query('select revision from profiles')).rows).toEqual([{ revision: 4 }]);
});
it('enforces ownership and denies client writes and privileged RPC access', async () => {
  await db.exec(`set role authenticated;set request.jwt.claim.sub='${other}';`);
  expect((await db.query('select * from user_words')).rows).toEqual([]);
  expect((await db.query('select * from profiles')).rows).toEqual([]);
  expect((await db.query('select * from review_events')).rows).toEqual([]);
  await expect(
    db.query('select cache_lexical_word($1::jsonb)', [JSON.stringify(catalog[0])]),
  ).rejects.toThrow(/permission denied/);
  await expect(
    db.query('select commit_learning_state($1,0,$2::jsonb)', [
      user,
      JSON.stringify(initialState()),
    ]),
  ).rejects.toThrow(/permission denied/);
  await expect(
    db.query('insert into suggestion_feedback values($1,$2)', [other, 'clarify']),
  ).rejects.toThrow(/permission denied|row-level security/);
  await db.exec(`set request.jwt.claim.sub='${user}';`);
  expect((await db.query('select word from user_words')).rows).toEqual([{ word: 'reluctant' }]);
  await db.exec('reset role');
});
it('caps generation atomically at twenty requests per UTC day', async () => {
  for (let i = 0; i < 20; i++)
    expect((await db.query('select consume_generation_quota($1) as allowed', [user])).rows).toEqual(
      [{ allowed: true }],
    );
  expect((await db.query('select consume_generation_quota($1) as allowed', [user])).rows).toEqual([
    { allowed: false },
  ]);
});

it('initializes new account preferences and limits summaries to the signed-in user', async () => {
  const newcomer = '40000000-0000-4000-8000-000000000004';
  await db.query('insert into auth.users(id,raw_user_meta_data) values($1,$2)', [
    newcomer,
    JSON.stringify({ display_name: 'New learner' }),
  ]);
  expect(
    (
      await db.query<{ settings: { displayName: string } }>(
        'select settings from profiles where id=$1',
        [newcomer],
      )
    ).rows[0].settings.displayName,
  ).toBe('New learner');
  await db.exec(`set role authenticated;set request.jwt.claim.sub='${user}';`);
  const summary = (
    await db.query<{ result: { xp: number; completedDays: number } }>(
      "select learning_summary('2026-09-12') result",
    )
  ).rows[0].result;
  expect(summary.xp).toBe(20);
  expect(summary.completedDays).toBe(1);
  await db.exec(`set request.jwt.claim.sub='${newcomer}';`);
  expect(
    (await db.query<{ result: { xp: number } }>("select learning_summary('2026-09-12') result"))
      .rows[0].result.xp,
  ).toBe(0);
  await expect(
    db.query("select claim_word_generation('hello','50000000-0000-4000-8000-000000000005')"),
  ).rejects.toThrow('permission denied');
  await db.exec('reset role');
});
it('serializes generation leases and ignores release by a different token', async () => {
  const token = '50000000-0000-4000-8000-000000000005';
  expect(
    (await db.query('select claim_word_generation($1,$2) claimed', ['hello', token])).rows,
  ).toEqual([{ claimed: true }]);
  expect(
    (await db.query('select claim_word_generation($1,$2) claimed', ['hello', other])).rows,
  ).toEqual([{ claimed: false }]);
  await db.query('select release_word_generation($1,$2)', ['hello', other]);
  expect(
    (await db.query('select claim_word_generation($1,$2) claimed', ['hello', other])).rows,
  ).toEqual([{ claimed: false }]);
  await db.query('select release_word_generation($1,$2)', ['hello', token]);
  expect(
    (await db.query('select claim_word_generation($1,$2) claimed', ['hello', other])).rows,
  ).toEqual([{ claimed: true }]);
});

it('caches input aliases atomically and preserves the first canonical lesson', async () => {
  const content = { ...catalog[0], word: 'testlemma' };
  await db.query('select cache_generated_word($1::jsonb,$2)', [
    JSON.stringify(content),
    'testlemmas',
  ]);
  await db.query('select cache_generated_word($1::jsonb,$2)', [
    JSON.stringify({
      ...content,
      scenario: 'A different valid scenario that must not replace the canonical row.',
    }),
    'testlemma',
  ]);
  expect(
    (await db.query('select word from word_aliases where alias=$1', ['testlemmas'])).rows,
  ).toEqual([{ word: 'testlemma' }]);
  expect(
    (
      await db.query<{ content: typeof content }>('select content from words where word=$1', [
        'testlemma',
      ])
    ).rows[0].content.scenario,
  ).toBe(content.scenario);
});
