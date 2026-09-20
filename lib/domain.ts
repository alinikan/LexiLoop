import {
  emptyWorkspace,
  containsWord,
  type Workspace,
  type SkillRecord,
  type Evidence,
  type SessionDraft,
} from './practice';
import { UserError } from '@/lib/errors';
import type { Word } from './ai/schemas';
import { freshSchedule, scheduleReview, type Schedule } from './spaced-repetition';
import { normalizeWord } from './validation/word';
export type SavedWord = {
  skills?: SkillRecord;
  memory?: { attempts: number; correct: number };
  word: string;
  source: 'personal' | 'suggested';
  note: string;
  context: string;
  tag: string;
  priority: boolean;
  favorite: boolean;
  archived: boolean;
  known?: boolean;
  addedAt: string;
  sentence: string;
  schedule: Schedule;
};
export type Settings = {
  displayName?: string;
  reducedMotion?: boolean;
  goal: number;
  level: 'A2' | 'B1' | 'B2' | 'C1';
  interests: string[];
  reminder: boolean;
  reminderTime: string;
  timezone: string;
  onboarded: boolean;
  dark: boolean;
};
export type DailySet = {
  date: string;
  goal: number;
  words: string[];
  completed: string[];
  started: boolean;
};
export type ReviewEvent = {
  id: string;
  word: string;
  at: string;
  quality: 0 | 1 | 2 | 3;
  kind: 'learn' | 'review';
  interval: number;
  date: string;
};
export type State = {
  workspace?: Workspace;
  summary?: {
    reviews: number;
    accuracy: number;
    xp: number;
    streak: number;
    longest: number;
    completedDays: number;
    activity: Record<string, number>;
  };
  version: number;
  settings: Settings;
  words: SavedWord[];
  days: DailySet[];
  events: ReviewEvent[];
  dismissed: string[];
};
export type Command =
  | { type: 'daily-plan'; words: string[] }
  | { type: 'checkpoint'; draft: SessionDraft }
  | { type: 'discard-session'; kind: 'learn' | 'review' }
  | { type: 'capture'; id: string; word: string; context: string }
  | { type: 'remove-capture' | 'remove-usage'; id: string }
  | {
      type: 'usage';
      id: string;
      words: string[];
      situation: string;
      text: string;
      reflection: 'ready' | 'revisit';
    }
  | { type: 'forget'; word: string }
  | { type: 'know'; word: string; source?: 'personal' | 'suggested' }
  | { type: 'practice-word'; word: string }
  | { type: 'settings'; settings: Settings }
  | {
      type: 'save';
      word: string;
      source: 'personal' | 'suggested';
      note?: string;
      context?: string;
      tag?: string;
      priority?: boolean;
      toToday?: boolean;
      captureId?: string;
    }
  | { type: 'select' | 'remove' | 'dismiss'; word: string }
  | { type: 'start' }
  | {
      type: 'complete';
      evidence?: Evidence[];
      nextSession?: SessionDraft | null;
      sessionKind?: 'learn' | 'review';
      word: string;
      quality: 0 | 1 | 2 | 3;
      confidence?: number;
      day?: string;
      kind: 'learn' | 'review';
      sentence: string;
      id: string;
    }
  | {
      type: 'edit';
      word: string;
      note: string;
      context: string;
      tag: string;
      favorite: boolean;
      archived: boolean;
    }
  | { type: 'reset'; word: string };
export const initialState = (): State => ({
  version: 0,
  workspace: emptyWorkspace(),
  settings: {
    goal: 5,
    level: 'B1',
    interests: ['Everyday', 'Workplace'],
    reminder: false,
    reminderTime: '09:00',
    timezone: 'UTC',
    onboarded: false,
    dark: false,
  },
  words: [],
  days: [],
  events: [],
  dismissed: [],
});
export function dayKey(date = new Date(), timezone = 'UTC') {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}
export function todaySet(state: State, now = new Date()): DailySet {
  return (
    state.days.find((d) => d.date === dayKey(now, state.settings.timezone)) ?? {
      date: dayKey(now, state.settings.timezone),
      goal: state.settings.goal,
      words: [],
      completed: [],
      started: false,
    }
  );
}
export function applyCommand(
  input: State,
  command: Command,
  catalog: Word[],
  now = new Date(),
): State {
  const state = structuredClone(input),
    date = dayKey(now, state.settings.timezone);
  state.workspace ??= emptyWorkspace();
  const workspace = state.workspace;
  const today =
    command.type === 'complete' && command.kind === 'learn' && command.day
      ? state.days.find((d) => d.date === command.day)
      : todaySet(state, now);
  if (!today) throw new UserError('That daily lesson could not be found. Reload your wordbook.');
  if (!state.days.some((d) => d.date === today.date)) state.days.push(today);
  const lookup = (word: string) => {
    const saved = state.words.find((w) => w.word === word);
    if (!saved) throw new UserError('Save this word first.');
    return saved;
  };
  const removeFromPendingWork = (word: string) => {
    for (const day of state.days) {
      if (
        (day.date === date || day.date === workspace.sessions.learn?.day) &&
        day.words.includes(word) &&
        !day.completed.includes(word)
      ) {
        day.words = day.words.filter((name) => name !== word);
        if (day.started) day.goal = day.words.length;
        if (!day.words.length) {
          day.started = false;
          day.goal = state.settings.goal;
        }
      }
    }
    for (const kind of ['learn', 'review'] as const) {
      if (workspace.sessions[kind]?.words.includes(word)) delete workspace.sessions[kind];
    }
  };
  switch (command.type) {
    case 'daily-plan': {
      if (today.started) throw new UserError('Finish the started lesson before changing its set.');
      if (
        new Set(command.words).size !== command.words.length ||
        command.words.length > 20 ||
        !command.words.length
      )
        throw new UserError('Choose between 1 and 20 different words.');
      for (const name of command.words) {
        if (!catalog.some((w) => w.word === name))
          throw new UserError('Build the word card first.');
        const saved = state.words.find((w) => w.word === name);
        if (saved?.archived || saved?.known || saved?.schedule.firstLearned)
          throw new UserError('Choose active, unlearned words.');
        if (!saved)
          state.words.push({
            word: name,
            source: 'suggested',
            note: '',
            context: '',
            tag: '',
            priority: false,
            favorite: false,
            archived: false,
            known: false,
            addedAt: now.toISOString(),
            sentence: '',
            schedule: freshSchedule(),
          });
      }
      today.words = [...command.words];
      today.goal = command.words.length;
      break;
    }
    case 'forget': {
      lookup(command.word);
      state.words = state.words.filter((w) => w.word !== command.word);
      removeFromPendingWork(command.word);
      break;
    }
    case 'know': {
      if (!catalog.some((word) => word.word === command.word))
        throw new UserError('Build the word card first.');
      let saved = state.words.find((word) => word.word === command.word);
      if (!saved) {
        saved = {
          word: command.word,
          source: command.source ?? 'suggested',
          note: '',
          context: '',
          tag: '',
          priority: false,
          favorite: false,
          archived: false,
          known: true,
          addedAt: now.toISOString(),
          sentence: '',
          schedule: freshSchedule(),
        };
        state.words.push(saved);
      }
      saved.known = true;
      saved.archived = false;
      removeFromPendingWork(command.word);
      break;
    }
    case 'practice-word': {
      const saved = lookup(command.word);
      saved.known = false;
      saved.archived = false;
      break;
    }
    case 'checkpoint': {
      const draft = command.draft;
      for (const name of draft.words) {
        const saved = lookup(name);
        if (
          saved.archived ||
          saved.known ||
          (draft.kind === 'review' && !saved.schedule.firstLearned)
        )
          throw new UserError('This session contains an unavailable word.');
      }
      if (draft.kind === 'learn') {
        const day = state.days.find((d) => d.date === draft.day);
        if (
          !day?.started ||
          draft.words.some(
            (w) => !day.words.includes(w) && !(draft.mixed && lookup(w).schedule.firstLearned),
          )
        )
          throw new UserError('This daily session is no longer available.');
        if (!draft.mixed && day.completed.includes(draft.words[draft.index]))
          throw new UserError('This word was already completed. Reload to continue.');
      }
      const old = state.workspace.sessions[draft.kind];
      if (old && old.id !== draft.id)
        throw new UserError('Resume or discard your saved session before starting another.');
      state.workspace.sessions[draft.kind] = draft;
      break;
    }
    case 'discard-session':
      delete state.workspace.sessions[command.kind];
      break;
    case 'capture': {
      const word = normalizeWord(command.word);
      const old = state.workspace.inbox.find((c) => c.id === command.id);
      if (!old && state.workspace.inbox.length >= 100)
        throw new UserError('Your inbox is full. Build or remove a capture first.');
      if (old) Object.assign(old, { word, context: command.context });
      else
        state.workspace.inbox.unshift({
          id: command.id,
          word,
          context: command.context,
          at: now.toISOString(),
        });
      break;
    }
    case 'remove-capture':
      state.workspace.inbox = state.workspace.inbox.filter((c) => c.id !== command.id);
      break;
    case 'usage': {
      if (
        new Set(command.words).size !== command.words.length ||
        command.words.length < 2 ||
        command.words.length > 3
      )
        throw new UserError('Choose two or three different words.');
      command.words.forEach((w) => {
        if (lookup(w).archived || !containsWord(command.text, w))
          throw new UserError('Use each selected word in your thought.');
      });
      if (state.workspace.usage.some((p) => p.id === command.id)) return input;
      if (state.workspace.usage.length >= 100)
        throw new UserError(
          'Your practice journal is full. Remove an entry before saving another.',
        );
      state.workspace.usage.unshift({ ...command, at: now.toISOString() });
      break;
    }
    case 'remove-usage':
      state.workspace.usage = state.workspace.usage.filter((p) => p.id !== command.id);
      break;

    case 'settings':
      if (
        !Number.isInteger(command.settings.goal) ||
        command.settings.goal < 1 ||
        command.settings.goal > 20
      )
        throw new UserError('Choose a goal from 1 to 20.');
      dayKey(now, command.settings.timezone);
      if (
        command.settings.timezone !== state.settings.timezone &&
        today.words.length &&
        today.completed.length < today.goal &&
        dayKey(now, command.settings.timezone) !== date
      )
        throw new UserError(
          'Finish today’s practice before changing to a timezone on a different calendar day. Your selected words are safe.',
        );
      state.settings = command.settings;
      if (!today.started) {
        if (today.words.length > command.settings.goal)
          throw new UserError('Remove words from today before reducing your goal.');
        today.goal = command.settings.goal;
      }
      break;
    case 'save': {
      const word = normalizeWord(command.word);
      if (state.words.some((w) => w.word === word))
        throw new UserError('This word is already in your collection.');
      if (!catalog.some((w) => w.word === word))
        throw new UserError('Build the word card before saving.');
      state.words.push({
        word,
        source: command.source,
        note: command.note ?? '',
        context: command.context ?? '',
        tag: command.tag ?? '',
        priority: command.priority ?? false,
        favorite: false,
        archived: false,
        known: false,
        addedAt: now.toISOString(),
        sentence: '',
        schedule: freshSchedule(),
      });
      if (command.captureId)
        state.workspace.inbox = state.workspace.inbox.filter((c) => c.id !== command.captureId);
      if (command.toToday) {
        if (today.started) throw new UserError('Your lesson has started. Today’s set is locked.');
        if (today.words.length >= today.goal)
          throw new UserError('Today is full. Save for later instead.');
        today.words.push(word);
      }
      break;
    }
    case 'select': {
      const saved = lookup(command.word);
      if (today.started) throw new UserError('Your lesson has started. Today’s set is locked.');
      if (saved.archived || saved.known || saved.schedule.firstLearned)
        throw new UserError('Choose an unlearned, active word.');
      if (today.words.includes(command.word)) throw new UserError('Already selected for today.');
      if (today.words.length >= today.goal)
        throw new UserError('Today is full. Remove a word to make room.');
      today.words.push(command.word);
      break;
    }
    case 'remove':
      if (today.started) throw new UserError('Your lesson has started.');
      today.words = today.words.filter((w) => w !== command.word);
      break;
    case 'dismiss':
      if (!state.dismissed.includes(command.word)) state.dismissed.push(command.word);
      break;
    case 'start':
      if (today.words.length !== today.goal) throw new UserError('Fill your daily slots first.');
      today.started = true;
      break;
    case 'complete': {
      if (state.events.some((e) => e.id === command.id)) return input;
      const saved = lookup(command.word);
      if (saved.archived || saved.known)
        throw new UserError('Move this word back to practice before reviewing.');
      if (command.kind === 'learn') {
        if (!today.started || !today.words.includes(command.word))
          throw new UserError('Start today’s lesson first.');
        if (today.completed.includes(command.word)) return input;
        today.completed.push(command.word);
      } else if (!saved.schedule.firstLearned) throw new UserError('Learn this word first.');
      const evidence = command.evidence ?? [];
      saved.skills ??= {};
      for (const e of evidence) {
        const record = saved.skills[e.skill] ?? { attempts: 0, correct: 0, recent: [] };
        record.attempts++;
        record.correct += Number(e.correct);
        record.recent = [...record.recent, e.correct].slice(-5);
        saved.skills[e.skill] = record;
      }
      const recall = evidence.find((e) => e.skill === 'recall');
      if (
        command.kind === 'review' &&
        recall &&
        saved.schedule.lastReviewed &&
        now.getTime() - new Date(saved.schedule.lastReviewed).getTime() >= 86400000
      ) {
        saved.memory ??= { attempts: 0, correct: 0 };
        saved.memory.attempts++;
        saved.memory.correct += Number(recall.correct);
      }
      if (command.nextSession !== undefined) {
        if (command.nextSession) {
          if (
            command.nextSession.kind !== (command.sessionKind ?? command.kind) ||
            command.nextSession.words.some(
              (w) => !state.words.some((s) => s.word === w && !s.archived),
            )
          )
            throw new UserError('Invalid next session.');
          state.workspace.sessions[command.sessionKind ?? command.kind] = command.nextSession;
        } else delete state.workspace.sessions[command.sessionKind ?? command.kind];
      }
      saved.schedule = scheduleReview(saved.schedule, command.quality, now);
      if (command.confidence !== undefined)
        saved.schedule.confidence = Math.max(0, Math.min(4, Math.round(command.confidence)));
      saved.sentence = command.sentence || saved.sentence;
      state.events.push({
        id: command.id,
        word: command.word,
        quality: command.quality,
        at: now.toISOString(),
        date,
        kind: command.kind,
        interval: saved.schedule.interval,
      });
      break;
    }
    case 'edit': {
      const saved = lookup(command.word);
      if (
        command.archived &&
        today.words.includes(command.word) &&
        !today.completed.includes(command.word)
      )
        throw new UserError('Remove this word from today or finish its lesson before archiving.');
      Object.assign(saved, {
        note: command.note,
        context: command.context,
        tag: command.tag,
        favorite: command.favorite,
        archived: command.archived,
      });
      break;
    }
    case 'reset': {
      const saved = lookup(command.word);
      if (
        today.started &&
        today.words.includes(command.word) &&
        !today.completed.includes(command.word)
      )
        throw new UserError('Finish today’s lesson before resetting.');
      saved.schedule = freshSchedule();
      saved.sentence = '';
      break;
    }
  }
  state.version++;
  return state;
}
export function dueWords(state: State, now = new Date()) {
  return state.words
    .filter(
      (w) =>
        !w.archived && !w.known && w.schedule.nextReview && new Date(w.schedule.nextReview) <= now,
    )
    .sort((a, b) => a.schedule.nextReview!.localeCompare(b.schedule.nextReview!));
}
export function metrics(state: State, now = new Date()) {
  const learned = state.words.filter((w) => !w.known && w.schedule.firstLearned);
  const dates = [...new Set(state.events.map((e) => e.date))].sort();
  let longest = 0,
    run = 0,
    previous = '';
  for (const date of dates) {
    run =
      previous && new Date(date).getTime() - new Date(previous).getTime() === 86400000
        ? run + 1
        : 1;
    longest = Math.max(longest, run);
    previous = date;
  }
  let streak = 0;
  let cursor = new Date(dayKey(now, state.settings.timezone) + 'T12:00:00Z');
  if (!dates.includes(cursor.toISOString().slice(0, 10)))
    cursor = new Date(cursor.getTime() - 86400000);
  while (dates.includes(cursor.toISOString().slice(0, 10))) {
    streak++;
    cursor = new Date(cursor.getTime() - 86400000);
  }
  return {
    learned: learned.length,
    mastered: learned.filter((w) => w.schedule.interval >= 30 && w.schedule.confidence >= 3).length,
    reviews: state.events.filter((e) => e.kind === 'review').length,
    accuracy: state.events.length
      ? Math.round((state.events.filter((e) => e.quality >= 2).length / state.events.length) * 100)
      : 0,
    xp: state.events.reduce((s, e) => s + (e.kind === 'learn' ? 20 : 10), 0),
    streak,
    longest,
    completedDays: state.days.filter((d) => d.completed.length === d.goal).length,
    ...state.summary,
  };
}
