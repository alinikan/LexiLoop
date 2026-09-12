import { UserError } from '@/lib/errors';
import type { Word } from './ai/schemas';
import { freshSchedule, scheduleReview, type Schedule } from './spaced-repetition';
import { normalizeWord } from './validation/word';
export type SavedWord = {
  word: string;
  source: 'personal' | 'suggested';
  note: string;
  context: string;
  tag: string;
  priority: boolean;
  favorite: boolean;
  archived: boolean;
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
    }
  | { type: 'select' | 'remove' | 'dismiss'; word: string }
  | { type: 'start' }
  | {
      type: 'complete';
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
  switch (command.type) {
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
        addedAt: now.toISOString(),
        sentence: '',
        schedule: freshSchedule(),
      });
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
      if (saved.archived || saved.schedule.firstLearned)
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
      if (saved.archived) throw new UserError('Restore this word before reviewing.');
      if (command.kind === 'learn') {
        if (!today.started || !today.words.includes(command.word))
          throw new UserError('Start today’s lesson first.');
        if (today.completed.includes(command.word)) return input;
        today.completed.push(command.word);
      } else if (!saved.schedule.firstLearned) throw new UserError('Learn this word first.');
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
    .filter((w) => !w.archived && w.schedule.nextReview && new Date(w.schedule.nextReview) <= now)
    .sort((a, b) => a.schedule.nextReview!.localeCompare(b.schedule.nextReview!));
}
export function metrics(state: State, now = new Date()) {
  const learned = state.words.filter((w) => w.schedule.firstLearned);
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
