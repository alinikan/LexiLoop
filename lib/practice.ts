import type { State, SavedWord } from './domain';
import type { Word } from './ai/schemas';
export const lessonSteps = [
  'Discover',
  'Understand',
  'Context',
  'Distinguish',
  'Recall',
  'Make it yours',
  'Apply',
  'Recap',
] as const;
export type Step = (typeof lessonSteps)[number];
export type Skill = 'meaning' | 'context' | 'distinction' | 'recall' | 'application';
export type Evidence = { skill: Skill; correct: boolean };
export type SkillRecord = Partial<
  Record<Skill, { attempts: number; correct: number; recent: boolean[] }>
>;
export type SessionDraft = {
  mixed?: {
    queue: { index: number; step: Step }[];
    cursor: number;
    progress: Record<
      string,
      { evidence: Evidence[]; mistakes: number; sentence: string; confidence: number }
    >;
  };
  id: string;
  kind: 'learn' | 'review';
  day: string;
  words: string[];
  index: number;
  step: number;
  steps: Step[];
  answer: number | null;
  text: string;
  sentence: string;
  checked: boolean;
  mistakes: number;
  confidence: number;
  eventId: string;
  evidence: Evidence[];
};
export type Capture = { id: string; word: string; context: string; at: string };
export type UsagePractice = {
  id: string;
  words: string[];
  situation: string;
  text: string;
  reflection: 'ready' | 'revisit';
  at: string;
};
export type Workspace = {
  sessions: Partial<Record<'learn' | 'review', SessionDraft>>;
  inbox: Capture[];
  usage: UsagePractice[];
};
export const emptyWorkspace = (): Workspace => ({ sessions: {}, inbox: [], usage: [] });
export function workspace(state: State) {
  return state.workspace ?? emptyWorkspace();
}
export function stepSkill(step: string): Skill | undefined {
  return (
    {
      Understand: 'meaning',
      Context: 'context',
      Distinguish: 'distinction',
      Recall: 'recall',
      Apply: 'application',
    } as Record<string, Skill>
  )[step];
}
export function weakSkills(saved?: SavedWord): Skill[] {
  return Object.entries(saved?.skills ?? {})
    .filter(
      ([, s]) =>
        s.recent.some((v) => !v) && s.recent.filter(Boolean).length / s.recent.length < 0.8,
    )
    .map(([key]) => key as Skill);
}
export function practiceSteps(kind: 'learn' | 'review', saved?: SavedWord): Step[] {
  if (kind === 'learn') return [...lessonSteps];
  const weak = weakSkills(saved);
  // Recall always comes before any definition/answer is shown. Extra exercises target observed mistakes.
  return [
    'Recall',
    ...(weak.includes('meaning') ? ['Understand' as const] : []),
    'Context',
    ...(weak.includes('recall') ? ['Recall' as const] : []),
    ...(weak.includes('distinction') ? ['Distinguish' as const] : []),
    ...(weak.includes('application') ? ['Apply' as const, 'Make it yours' as const] : []),
    'Recap',
  ];
}
export function createSession(
  state: State,
  words: string[],
  kind: 'learn' | 'review',
  day: string,
  id: string,
  eventId: string,
): SessionDraft {
  return {
    id,
    kind,
    day,
    words,
    index: 0,
    step: 0,
    steps: practiceSteps(
      kind,
      state.words.find((w) => w.word === words[0]),
    ),
    answer: null,
    text: '',
    sentence: '',
    checked: false,
    mistakes: 0,
    confidence: 2,
    eventId,
    evidence: [],
  };
}
export function recommendations(
  state: State,
  catalog: Word[],
  date: string,
): { word: string; reason: string }[] {
  const score = (word: Word) => {
    const saved = state.words.find((w) => w.word === word.word);
    return (
      (saved?.priority ? 1000 : 0) +
      (saved?.source === 'personal' ? 300 : saved ? 200 : 0) +
      (word.categories.some((c) => state.settings.interests.includes(c)) ? 50 : 0) +
      (word.difficulty === state.settings.level ? 20 : 0)
    );
  };
  const hash = (s: string) => [...s].reduce((n, c) => (n * 31 + c.charCodeAt(0)) >>> 0, 0);
  return catalog
    .filter((w) => {
      const saved = state.words.find((s) => s.word === w.word);
      return (
        (saved || w.difficulty === state.settings.level) &&
        !saved?.archived &&
        !saved?.schedule.firstLearned &&
        !state.dismissed.includes(w.word)
      );
    })
    .toSorted((a, b) => score(b) - score(a) || hash(date + a.word) - hash(date + b.word))
    .map((w) => ({
      word: w.word,
      reason: state.words.find((s) => s.word === w.word)?.priority
        ? 'You prioritized this'
        : state.words.some((s) => s.word === w.word)
          ? 'From your saved words'
          : w.categories.some((c) => state.settings.interests.includes(c))
            ? `For your interests`
            : 'A new possibility',
    }));
}
export function containsWord(text: string, word: string) {
  return (
    ' ' +
    text
      .toLowerCase()
      .replace(/[^a-z' -]/g, ' ')
      .replace(/\s+/g, ' ') +
    ' '
  ).includes(' ' + word.toLowerCase() + ' ');
}
export function memoryMetrics(state: State) {
  const words = state.words.filter((w) => !w.archived);
  return {
    encountered: words.length,
    learned: words.filter((w) => w.schedule.firstLearned).length,
    delayedAttempts: words.reduce((n, w) => n + (w.memory?.attempts ?? 0), 0),
    delayedCorrect: words.reduce((n, w) => n + (w.memory?.correct ?? 0), 0),
    recalled: words.filter((w) => (w.memory?.correct ?? 0) > 0).length,
    tricky: words.filter((w) => weakSkills(w).length > 0),
    used: new Set(
      workspace(state)
        .usage.filter((p) => p.reflection === 'ready')
        .flatMap((p) => p.words)
        .filter((name) => words.some((w) => w.word === name)),
    ).size,
  };
}

/** Round-based interleaving keeps every word in the set and adds practice for weak skills. */
export function createMixedSession(
  state: State,
  newWords: string[],
  _kind: 'learn' | 'review',
  day: string,
  id: string,
  eventId: string,
): SessionDraft {
  const words = [
    ...new Set([
      ...newWords,
      ...state.words.filter((w) => !w.archived && w.schedule.firstLearned).map((w) => w.word),
    ]),
  ];
  const draft = createSession(state, words, 'learn', day, id, eventId);
  const queue: { index: number; step: Step }[] = newWords.map((name) => ({
    index: words.indexOf(name),
    step: 'Discover',
  }));
  const rounds = words.map((name) =>
    newWords.includes(name)
      ? [...lessonSteps.filter((s) => s !== 'Discover')]
      : practiceSteps(
          'review',
          state.words.find((w) => w.word === name),
        ),
  );
  let seed = [...id].reduce((n, c) => (n * 31 + c.charCodeAt(0)) >>> 0, 1);
  const random = () => {
    seed = (1664525 * seed + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  while (rounds.some((r) => r.length)) {
    const indices = rounds.flatMap((r, i) => (r.length ? [i] : []));
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }
    for (const index of indices) queue.push({ index, step: rounds[index].shift()! });
  }
  draft.mixed = { queue, cursor: 0, progress: {} };
  draft.index = queue[0].index;
  draft.steps = [queue[0].step];
  return draft;
}
export function advanceMixed(draft: SessionDraft): SessionDraft | null {
  const mixed = draft.mixed!;
  const cursor = mixed.cursor + 1;
  const task = mixed.queue[cursor];
  if (!task) return null;
  const progress = {
    ...mixed.progress,
    [draft.words[draft.index]]: {
      evidence: draft.evidence,
      mistakes: draft.mistakes,
      sentence: draft.sentence,
      confidence: draft.confidence,
    },
  };
  const next = progress[draft.words[task.index]];
  return {
    ...draft,
    mixed: { ...mixed, cursor, progress },
    index: task.index,
    step: 0,
    steps: [task.step],
    evidence: next?.evidence ?? [],
    mistakes: next?.mistakes ?? 0,
    sentence: next?.sentence ?? '',
    confidence: next?.confidence ?? 2,
    text: '',
    answer: null,
    checked: false,
    eventId: crypto.randomUUID(),
  };
}
