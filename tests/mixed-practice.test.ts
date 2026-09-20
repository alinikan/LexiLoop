import { containsWord } from '@/lib/practice';
import { expect, it } from 'vitest';
import { catalog } from '@/data/catalog';
import { initialState, applyCommand } from '@/lib/domain';
import { createMixedSession, advanceMixed, workspace, stepSkill } from '@/lib/practice';
import { sessionSchema } from '@/lib/validation/practice';
const now = new Date('2026-09-13T12:00:00Z');
const id = '90000000-0000-4000-8000-000000000001';
function prepared() {
  let state = initialState();
  for (const word of catalog.slice(0, 10)) {
    state = applyCommand(
      state,
      { type: 'save', word: word.word, source: 'personal' },
      catalog,
      now,
    );
    state.words.at(-1)!.schedule.firstLearned = '2026-09-10T12:00:00Z';
    state.words.at(-1)!.schedule.lastReviewed = '2026-09-10T12:00:00Z';
  }
  state.words[0].skills = {
    meaning: { attempts: 2, correct: 0, recent: [false, false] },
    recall: { attempts: 2, correct: 0, recent: [false, false] },
  };
  const names = catalog.slice(10, 15).map((w) => w.word);
  state = applyCommand(state, { type: 'daily-plan', words: names }, catalog, now);
  state = applyCommand(state, { type: 'start' }, catalog, now);
  return { state, names };
}
it('teaches five new words first, then interleaves all fifteen and gives weak words extra work', () => {
  const { state, names } = prepared();
  const draft = createMixedSession(state, names, 'learn', '2026-09-13', id, id);
  expect(draft.words).toHaveLength(15);
  expect(draft.mixed!.queue.slice(0, 5).map((t) => [draft.words[t.index], t.step])).toEqual(
    names.map((w) => [w, 'Discover']),
  );
  expect(draft.mixed!.queue.slice(5).every((t) => t.step !== 'Discover')).toBe(true);
  const count = (name: string) =>
    draft.mixed!.queue.filter((t) => draft.words[t.index] === name).length;
  expect(count(state.words[0].word)).toBeGreaterThan(count(state.words[1].word));
  expect(new Set(draft.mixed!.queue.slice(5, 20).map((t) => t.index)).size).toBe(15);
  expect(sessionSchema.parse(draft)).toEqual(draft);
});
it('saves and resumes mixed evidence, commits each word once, and finishes the original daily set', () => {
  const preparedState = prepared();
  let state = preparedState.state;
  const names = preparedState.names;
  let draft = createMixedSession(state, names, 'learn', '2026-09-13', id, id);
  let visited = 0;
  while (true) {
    state = applyCommand(
      state,
      { type: 'checkpoint', draft: sessionSchema.parse(draft) },
      catalog,
      now,
    );
    draft = structuredClone(workspace(state).sessions.learn!);
    const skill = stepSkill(draft.steps[0]);
    if (skill) draft.evidence.push({ skill, correct: draft.words[draft.index] !== names[0] });
    const next = advanceMixed(draft);
    if (draft.steps[0] === 'Recap') {
      const name = draft.words[draft.index];
      state = applyCommand(
        state,
        {
          type: 'complete',
          word: name,
          kind: names.includes(name) ? 'learn' : 'review',
          sessionKind: 'learn',
          day: draft.day,
          quality: 2,
          sentence: '',
          id: crypto.randomUUID(),
          evidence: draft.evidence,
          nextSession: next,
        },
        catalog,
        now,
      );
    }
    visited++;
    if (!next) break;
    draft = next;
  }
  expect(visited).toBeGreaterThan(50);
  expect(state.events).toHaveLength(15);
  expect(new Set(state.events.map((e) => e.word)).size).toBe(15);
  expect(state.days.find((d) => d.date === '2026-09-13')?.completed.toSorted()).toEqual(
    names.toSorted(),
  );
  expect(workspace(state).sessions.learn).toBeUndefined();
  expect(state.words.find((w) => w.word === names[0])?.skills?.meaning?.correct).toBe(0);
  expect(state.words[1].memory).toEqual({ attempts: 1, correct: 1 });
});
it('removes learned and unfinished words without deleting historical activity', () => {
  const preparedState = prepared();
  let state = preparedState.state;
  const names = preparedState.names;
  const draft = createMixedSession(state, names, 'learn', '2026-09-13', id, id);
  state = applyCommand(state, { type: 'checkpoint', draft }, catalog, now);
  state = applyCommand(state, { type: 'forget', word: names[0] }, catalog, now);
  expect(state.words.some((w) => w.word === names[0])).toBe(false);
  expect(state.days.at(-1)?.words).not.toContain(names[0]);
  expect(workspace(state).sessions.learn).toBeUndefined();
  const history = structuredClone(state.events);
  state = applyCommand(state, { type: 'forget', word: catalog[0].word }, catalog, now);
  expect(state.events).toEqual(history);
});
it('ships a large unique validated library with substantial advanced choices and real cloze blanks', () => {
  expect(catalog.length).toBeGreaterThanOrEqual(400);
  expect(new Set(catalog.map((w) => w.word)).size).toBe(catalog.length);
  expect(catalog.filter((w) => w.difficulty === 'C1').length).toBeGreaterThanOrEqual(198);
  for (const word of catalog) {
    expect(word.exercises.find((e) => e.type === 'context')!.prompt).toContain('_____');
    expect(word.meanings[0].examples).toHaveLength(2);
  }
});
it('removing the final unfinished word does not manufacture a completed zero-goal day', () => {
  let state = applyCommand(
    initialState(),
    { type: 'daily-plan', words: ['reluctant'] },
    catalog,
    now,
  );
  state = applyCommand(state, { type: 'start' }, catalog, now);
  state = applyCommand(state, { type: 'forget', word: 'reluctant' }, catalog, now);
  expect(state.days.at(-1)?.started).toBe(false);
  expect(state.days.at(-1)?.goal).toBeGreaterThan(0);
  expect(state.events).toHaveLength(0);
});
it('adds new library entries without overwriting old saved card content', async () => {
  const { mergeCatalog } = await import('@/lib/catalog');
  const old = {
    ...catalog[0],
    meanings: [
      { ...catalog[0].meanings[0], definition: 'The previously saved explanation remains intact.' },
    ],
  };
  const merged = mergeCatalog(catalog, [old]);
  expect(merged.find((w) => w.word === old.word)).toEqual(old);
  expect(merged).toHaveLength(catalog.length);
});
it('difficulty restricts new recommendations while respecting deliberately saved words', async () => {
  const { recommendations } = await import('@/lib/practice');
  let state = initialState();
  state.settings.level = 'C1';
  expect(
    recommendations(state, catalog, '2026-09-13').every(
      (r) => catalog.find((w) => w.word === r.word)?.difficulty === 'C1',
    ),
  ).toBe(true);
  state = applyCommand(
    state,
    { type: 'save', word: 'borrow', source: 'personal', priority: true },
    catalog,
    now,
  );
  expect(recommendations(state, catalog, '2026-09-13')[0].word).toBe('borrow');
});
it('the second expansion supplies complete examples and distinct exercise choices', async () => {
  const { moreWords } = await import('@/data/more-words');
  const names = moreWords
    .trim()
    .split('\n')
    .map((line) => line.split('|')[0]);
  expect(names).toHaveLength(177);
  expect(new Set(names).size).toBe(names.length);
  for (const name of names) {
    const word = catalog.find((w) => w.word === name)!;
    expect(word).toBeDefined();
    for (const example of word.meanings[0].examples) expect(containsWord(example, name)).toBe(true);
    for (const exercise of word.exercises)
      expect(new Set(exercise.options).size).toBe(exercise.options.length);
    expect(word.exercises.find((exercise) => exercise.type === 'context')?.prompt).toContain(
      '_____',
    );
  }
});
