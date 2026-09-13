import { describe, it, expect } from 'vitest';
import { catalog } from '@/data/catalog';
import { applyCommand, initialState, todaySet } from '@/lib/domain';
import {
  recommendations,
  workspace,
  createSession,
  practiceSteps,
  memoryMetrics,
  containsWord,
} from '@/lib/practice';
import { commandSchema } from '@/lib/validation/commands';
const now = new Date('2026-09-13T12:00:00Z');
const id = '91000000-0000-4000-8000-000000000001';
const nextId = '91000000-0000-4000-8000-000000000002';
function prepared() {
  return applyCommand(
    initialState(),
    { type: 'daily-plan', words: ['reluctant', 'concise'] },
    catalog,
    now,
  );
}
describe('editable daily recommendations', () => {
  it('does not change the user state, ranks priority words first, and is deterministic', () => {
    let state = initialState();
    state = applyCommand(
      state,
      { type: 'save', word: 'reluctant', source: 'personal', priority: true },
      catalog,
      now,
    );
    const before = structuredClone(state);
    expect(recommendations(state, catalog, '2026-09-13')[0].word).toBe('reluctant');
    expect(recommendations(state, catalog, '2026-09-13')).toEqual(
      recommendations(state, catalog, '2026-09-13'),
    );
    expect(state).toEqual(before);
  });
  it('accepts an edited goal for this day only and preserves it after starting', () => {
    let state = prepared();
    expect(todaySet(state, now).goal).toBe(2);
    expect(state.settings.goal).toBe(5);
    state = applyCommand(state, { type: 'daily-plan', words: ['concise'] }, catalog, now);
    expect(todaySet(state, now).words).toEqual(['concise']);
    state = applyCommand(state, { type: 'start' }, catalog, now);
    expect(() =>
      applyCommand(state, { type: 'daily-plan', words: ['reluctant'] }, catalog, now),
    ).toThrow(/started/);
    expect(todaySet(state, new Date('2026-09-14T12:00:00Z')).goal).toBe(5);
  });
  it('excludes dismissed, archived and learned words and rejects duplicate selection', () => {
    const state = prepared();
    state.words[0].archived = true;
    state.words[1].schedule.firstLearned = now.toISOString();
    state.dismissed = ['feasible'];
    expect(recommendations(state, catalog, '2026-09-13').map((w) => w.word)).not.toContain(
      'reluctant',
    );
    expect(recommendations(state, catalog, '2026-09-13').map((w) => w.word)).not.toContain(
      'concise',
    );
    expect(recommendations(state, catalog, '2026-09-13').map((w) => w.word)).not.toContain(
      'feasible',
    );
    expect(() =>
      applyCommand(
        initialState(),
        { type: 'daily-plan', words: ['reluctant', 'reluctant'] },
        catalog,
        now,
      ),
    ).toThrow(/different/);
  });
});
describe('private capture and use in everyday thoughts', () => {
  it('captures before a lesson exists, edits, and removes only on successful card save', () => {
    let state = applyCommand(
      initialState(),
      { type: 'capture', id, word: '  Reluctant ', context: 'Heard at lunch' },
      [],
      now,
    );
    expect(state.words).toHaveLength(0);
    state = applyCommand(
      state,
      { type: 'capture', id, word: 'reluctant', context: 'Updated context' },
      [],
      now,
    );
    expect(workspace(state).inbox).toHaveLength(1);
    expect(() =>
      applyCommand(
        state,
        { type: 'save', word: 'reluctant', source: 'personal', captureId: id },
        [],
        now,
      ),
    ).toThrow();
    expect(workspace(state).inbox).toHaveLength(1);
    state = applyCommand(
      state,
      {
        type: 'save',
        word: 'reluctant',
        source: 'personal',
        context: workspace(state).inbox[0].context,
        captureId: id,
      },
      catalog,
      now,
    );
    expect(workspace(state).inbox).toHaveLength(0);
    expect(state.words[0].context).toBe('Updated context');
  });
  it('requires complete target words, saves reflection without changing recall or XP', () => {
    let state = prepared();
    expect(containsWord('This is concisely written.', 'concise')).toBe(false);
    const before = structuredClone(state.words);
    expect(() =>
      applyCommand(
        state,
        {
          type: 'usage',
          id,
          words: ['reluctant', 'concise'],
          situation: 'Work',
          text: 'I was reluctant to agree.',
          reflection: 'ready',
        },
        catalog,
        now,
      ),
    ).toThrow(/each/);
    state = applyCommand(
      state,
      {
        type: 'usage',
        id,
        words: ['reluctant', 'concise'],
        situation: 'Work',
        text: 'I was reluctant to send a concise reply.',
        reflection: 'ready',
      },
      catalog,
      now,
    );
    expect(state.words).toEqual(before);
    expect(state.events).toHaveLength(0);
    expect(memoryMetrics(state).used).toBe(2);
    expect(workspace(state).usage).toHaveLength(1);
    state = applyCommand(state, { type: 'remove-usage', id }, catalog, now);
    expect(memoryMetrics(state).used).toBe(0);
  });
});
describe('resumable adaptive practice and honest memory evidence', () => {
  it('persists exact answers across midnight and atomically advances on completion', () => {
    let state = applyCommand(prepared(), { type: 'start' }, catalog, now);
    const draft = createSession(state, ['reluctant', 'concise'], 'learn', '2026-09-13', id, nextId);
    draft.step = 4;
    draft.text = 'reluc';
    state = applyCommand(state, { type: 'checkpoint', draft }, catalog, now);
    const restored = JSON.parse(JSON.stringify(state));
    expect(workspace(restored).sessions.learn?.text).toBe('reluc');
    const next = { ...draft, index: 1, step: 0, text: '', eventId: id };
    state = applyCommand(
      restored,
      {
        type: 'complete',
        word: 'reluctant',
        quality: 2,
        kind: 'learn',
        day: draft.day,
        sentence: '',
        id: nextId,
        evidence: [{ skill: 'distinction', correct: false }],
        nextSession: next,
      },
      catalog,
      new Date('2026-09-14T12:00:00Z'),
    );
    expect(state.days.find((d) => d.date === '2026-09-13')?.completed).toEqual(['reluctant']);
    expect(state.events[0].date).toBe('2026-09-14');
    expect(workspace(state).sessions.learn?.index).toBe(1);
    expect(practiceSteps('review', state.words[0])).toContain('Distinguish');
    expect(practiceSteps('review', state.words[0])[0]).toBe('Recall');
  });
  it('does not count confidence or short-gap practice as delayed recall', () => {
    let state = applyCommand(prepared(), { type: 'start' }, catalog, now);
    state = applyCommand(
      state,
      {
        type: 'complete',
        word: 'reluctant',
        quality: 3,
        confidence: 4,
        kind: 'learn',
        sentence: '',
        id,
      },
      catalog,
      now,
    );
    expect(memoryMetrics(state).delayedAttempts).toBe(0);
    state = applyCommand(
      state,
      {
        type: 'complete',
        word: 'reluctant',
        quality: 3,
        kind: 'review',
        sentence: '',
        id: nextId,
        evidence: [{ skill: 'recall', correct: true }],
      },
      catalog,
      new Date(now.getTime() + 60000),
    );
    expect(memoryMetrics(state).delayedAttempts).toBe(0);
    state = applyCommand(
      state,
      {
        type: 'complete',
        word: 'reluctant',
        quality: 0,
        kind: 'review',
        sentence: '',
        id: '91000000-0000-4000-8000-000000000003',
        evidence: [
          { skill: 'recall', correct: true },
          { skill: 'context', correct: false },
        ],
      },
      catalog,
      new Date('2026-09-15T12:00:00Z'),
    );
    expect(memoryMetrics(state)).toMatchObject({
      delayedAttempts: 1,
      delayedCorrect: 1,
      recalled: 1,
    });
  });
  it('targets meaning and application mistakes, but removes extra work after recovery', () => {
    const word = prepared().words[0];
    word.skills = {
      meaning: { attempts: 1, correct: 0, recent: [false] },
      application: { attempts: 1, correct: 0, recent: [false] },
    };
    expect(practiceSteps('review', word)).toEqual([
      'Recall',
      'Understand',
      'Context',
      'Apply',
      'Make it yours',
      'Recap',
    ]);
    word.skills.meaning!.recent = [true, true, true, true, true];
    word.skills.application!.recent = [true, true, true, true, true];
    expect(practiceSteps('review', word)).toEqual(['Recall', 'Context', 'Recap']);
  });
  it('validates draft shape and refuses foreign/unavailable session words', () => {
    const state = prepared();
    const draft = createSession(state, ['reluctant'], 'learn', '2026-09-13', id, nextId);
    expect(
      commandSchema.safeParse({ type: 'checkpoint', draft: { ...draft, index: 9 } }).success,
    ).toBe(false);
    expect(
      commandSchema.safeParse({ type: 'capture', id, word: '<script>', context: '' }).success,
    ).toBe(false);
    expect(() => applyCommand(state, { type: 'checkpoint', draft }, catalog, now)).toThrow(
      /no longer/,
    );
    expect(() =>
      applyCommand(
        state,
        { type: 'checkpoint', draft: { ...draft, words: ['unknown'] } },
        catalog,
        now,
      ),
    ).toThrow(/Save/);
  });
});
