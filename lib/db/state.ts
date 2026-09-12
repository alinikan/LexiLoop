import { UserError } from '@/lib/errors';
import 'server-only';
import { initialState, dayKey, type State } from '@/lib/domain';
import { validateWord, type Word } from '@/lib/ai/schemas';
import { catalog } from '@/data/catalog';
import { requireUser, adminClient } from './server';
export async function readState() {
  const { db, user } = await requireUser();
  const [
    { data: profile, error: pe },
    { data: words, error: we },
    { data: days, error: de },
    { data: events, error: ee },
    { data: dismissed, error: fe },
  ] = await Promise.all([
    db.from('profiles').select('*').eq('id', user.id).maybeSingle(),
    allRows(() => db.from('user_words').select('data').eq('user_id', user.id).order('word')),
    db
      .from('daily_word_sets')
      .select('data')
      .eq('user_id', user.id)
      .order('day', { ascending: false })
      .limit(31),
    db
      .from('review_events')
      .select('data')
      .eq('user_id', user.id)
      .order('reviewed_at', { ascending: false })
      .limit(100),
    allRows(() =>
      db.from('suggestion_feedback').select('word').eq('user_id', user.id).order('word'),
    ),
  ]);
  if (pe || we || de || ee || fe)
    throw new UserError(
      'Your collection could not be loaded. Check your connection and try again.',
    );
  const state: State = {
    ...initialState(),
    version: profile?.revision ?? 0,
    settings: {
      ...initialState().settings,
      displayName: user.user_metadata?.display_name ?? '',
      ...profile?.settings,
    },
    words: words?.map((w) => w.data) ?? [],
    days: days?.map((d) => d.data) ?? [],
    events: events?.map((e) => e.data) ?? [],
    dismissed: dismissed?.map((d) => d.word) ?? [],
  };
  const { data: summary, error: summaryError } = await db.rpc('learning_summary', {
    p_today: dayKey(new Date(), state.settings.timezone),
  });
  if (summaryError)
    throw new UserError(
      'Progress summaries could not be loaded. Check that database migrations are applied.',
    );
  state.summary = summary;
  const custom = state.words.map((w) => w.word).filter((w) => !catalog.some((c) => c.word === w));
  const content: Word[] = [];
  if (custom.length) {
    for (let offset = 0; offset < custom.length; offset += 100) {
      const { data, error } = await db
        .from('words')
        .select('content')
        .in('word', custom.slice(offset, offset + 100));
      if (error) throw new UserError('Word content could not be loaded.');
      content.push(...(data ?? []).map((w) => validateWord(w.content)));
    }
  }
  return { state, catalog: [...catalog, ...content], userId: user.id, email: user.email };
}
export async function commitState(userId: string, before: State, state: State) {
  const { error } = await adminClient().rpc('commit_learning_state', {
    p_user: userId,
    p_expected: before.version,
    p_state: {
      ...state,
      summary: undefined,
      words: state.words.filter(
        (w) => JSON.stringify(w) !== JSON.stringify(before.words.find((b) => b.word === w.word)),
      ),
      days: state.days.filter(
        (d) => JSON.stringify(d) !== JSON.stringify(before.days.find((b) => b.date === d.date)),
      ),
      events: state.events.filter((e) => !before.events.some((b) => b.id === e.id)),
      dismissed: state.dismissed.filter((w) => !before.dismissed.includes(w)),
    },
  });
  if (error) {
    if (error.message.includes('revision_conflict'))
      throw new UserError('Your progress changed in another tab. Reload and try again.');
    throw new UserError('We couldn’t save your progress. Please try again.');
  }
}
export async function cacheWord(word: Word, input: string) {
  const { error } = await adminClient().rpc('cache_generated_word', {
    p_content: word,
    p_input: input,
  });
  if (error) throw new UserError('We couldn’t save this word’s content. Please try again.');
  const { data, error: readError } = await adminClient()
    .from('words')
    .select('content')
    .eq('word', word.word)
    .single();
  if (readError || !data) throw new UserError('Saved content could not be read. Please retry.');
  return validateWord(data.content);
}

// Explicit ranges prevent PostgREST's default row cap from silently hiding saved words.
async function allRows<T>(
  query: () => {
    range: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>;
  },
) {
  const rows: T[] = [];
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await query().range(offset, offset + 499);
    if (error) return { data: null, error };
    rows.push(...(data ?? []));
    if (!data || data.length < 500) return { data: rows, error: null };
  }
}
