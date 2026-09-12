import { describe, it, expect } from 'vitest';
import { initialState, applyCommand, todaySet, dayKey, metrics } from '@/lib/domain';
import { freshSchedule, scheduleReview } from '@/lib/spaced-repetition';
import { inputWordSchema, normalizeWord } from '@/lib/validation/word';
import { validateWord } from '@/lib/ai/schemas';
import { catalog } from '@/data/catalog';
const now = new Date('2026-09-12T12:00:00Z');
describe('spaced repetition', () => {
  it('expands on remembered words and shortens on lapses', () => {
    const first = scheduleReview(freshSchedule(), 2, now),
      second = scheduleReview(first, 2, now),
      third = scheduleReview(second, 3, now);
    expect(first.interval).toBe(1);
    expect(second.interval).toBe(3);
    expect(third.interval).toBeGreaterThan(3);
    const lapse = scheduleReview(third, 0, now);
    expect(lapse.interval).toBeCloseTo(10 / 1440);
    expect(lapse.lapses).toBe(1);
    expect(lapse.nextReview).toBe('2026-09-12T12:10:00.000Z');
  });
  it('bounds ease and records counters', () => {
    let s = freshSchedule();
    for (let i = 0; i < 30; i++) s = scheduleReview(s, 0, now);
    expect(s.ease).toBe(1.3);
    expect(s.incorrectCount).toBe(30);
    expect(s.correctCount).toBe(0);
  });
});
describe('daily composition', () => {
  function oneWord() {
    let s = initialState();
    s.settings.goal = 1;
    s = applyCommand(s, { type: 'save', word: 'reluctant', source: 'personal' }, catalog, now);
    return applyCommand(s, { type: 'select', word: 'reluctant' }, catalog, now);
  }
  it('enforces duplicate and full-slot rules', () => {
    let s = oneWord();
    expect(() => applyCommand(s, { type: 'select', word: 'reluctant' }, catalog, now)).toThrow(
      'Already selected',
    );
    s = applyCommand(s, { type: 'save', word: 'feasible', source: 'suggested' }, catalog, now);
    expect(() => applyCommand(s, { type: 'select', word: 'feasible' }, catalog, now)).toThrow(
      'full',
    );
  });
  it('locks started sets, persists completion, and deduplicates events', () => {
    const s = applyCommand(oneWord(), { type: 'start' }, catalog, now);
    expect(() => applyCommand(s, { type: 'remove', word: 'reluctant' }, catalog, now)).toThrow(
      'started',
    );
    const command = {
      type: 'complete' as const,
      word: 'reluctant',
      quality: 2 as const,
      confidence: 2,
      kind: 'learn' as const,
      sentence: 'I was reluctant to leave.',
      id: '7ce9bcb6-f8e2-4f07-9ed9-5f7efa958a21',
    };
    const next = applyCommand(s, command, catalog, now);
    expect(todaySet(next, now).completed).toEqual(['reluctant']);
    expect(next.words[0].schedule.nextReview).toBeTruthy();
    expect(next.words[0].schedule.confidence).toBe(2);
    expect(applyCommand(next, command, catalog, now).events).toHaveLength(1);
    expect(metrics(next, now).streak).toBe(1);
  });
  it('rejects duplicate casing and handles inflection', () => {
    const s = oneWord();
    expect(() =>
      applyCommand(s, { type: 'save', word: ' RELUCTANT ', source: 'personal' }, catalog, now),
    ).toThrow('already');
    expect(normalizeWord(' Reinforced ')).toBe('reinforce');
    expect(normalizeWord('glass')).toBe('glass');
  });
  it('uses local calendar dates and protects started goals', () => {
    expect(dayKey(new Date('2026-09-12T01:00:00Z'), 'America/Vancouver')).toBe('2026-09-11');
    const s = applyCommand(oneWord(), { type: 'start' }, catalog, now);
    const next = applyCommand(
      s,
      { type: 'settings', settings: { ...s.settings, goal: 5 } },
      catalog,
      now,
    );
    expect(todaySet(next, now).goal).toBe(1);
    expect(todaySet(next, new Date('2026-09-13T12:00:00Z')).goal).toBe(5);
  });
  it('does not mutate original state', () => {
    const s = initialState();
    applyCommand(s, { type: 'save', word: 'feasible', source: 'personal' }, catalog, now);
    expect(s.words).toEqual([]);
  });
});
describe('content validation', () => {
  it('validates all editorial lessons', () =>
    catalog.forEach((w) => expect(validateWord(w)).toEqual(w)));
  it('rejects invalid answers and missing content', () => {
    const w = structuredClone(catalog[0]);
    w.exercises[0].answer = 3;
    expect(() => validateWord(w)).toThrow();
    expect(() => validateWord({ word: 'test' })).toThrow();
  });
  it('rejects non-word instructions and normalizes input', () => {
    expect(inputWordSchema.parse('  ClArIfY ')).toBe('clarify');
    expect(() => inputWordSchema.parse('<script>alert(1)</script>')).toThrow();
  });
});

describe('production regression rules', () => {
  it('saves and selects atomically without losing the word when a set is full', () => {
    const state = initialState();
    state.settings.goal = 1;
    const filled = applyCommand(
      state,
      { type: 'save', word: 'reluctant', source: 'personal', toToday: true },
      catalog,
      now,
    );
    expect(todaySet(filled, now).words).toEqual(['reluctant']);
    expect(() =>
      applyCommand(
        filled,
        { type: 'save', word: 'feasible', source: 'suggested', toToday: true },
        catalog,
        now,
      ),
    ).toThrow('full');
    expect(filled.words).toHaveLength(1);
  });
  it('keeps a selected set safe when a timezone edit crosses midnight', () => {
    const instant = new Date('2026-09-12T01:00:00Z');
    const filled = applyCommand(
      initialState(),
      { type: 'save', word: 'reluctant', source: 'personal', toToday: true },
      catalog,
      instant,
    );
    expect(() =>
      applyCommand(
        filled,
        { type: 'settings', settings: { ...filled.settings, timezone: 'America/Vancouver' } },
        catalog,
        instant,
      ),
    ).toThrow('calendar day');
    expect(todaySet(filled, instant).words).toEqual(['reluctant']);
  });
});

it('finishes an already-started lesson safely after local midnight', () => {
  const beforeMidnight = new Date('2026-09-12T23:59:00Z');
  let state = initialState();
  state.settings.goal = 1;
  state = applyCommand(
    state,
    { type: 'save', word: 'reluctant', source: 'personal', toToday: true },
    catalog,
    beforeMidnight,
  );
  state = applyCommand(state, { type: 'start' }, catalog, beforeMidnight);
  const completed = applyCommand(
    state,
    {
      type: 'complete',
      word: 'reluctant',
      kind: 'learn',
      day: '2026-09-12',
      quality: 2,
      sentence: 'I was reluctant to go.',
      id: '60000000-0000-4000-8000-000000000006',
    },
    catalog,
    new Date('2026-09-13T00:01:00Z'),
  );
  expect(completed.days[0].completed).toEqual(['reluctant']);
  expect(completed.events[0].date).toBe('2026-09-13');
});
