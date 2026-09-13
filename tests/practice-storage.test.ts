import { beforeEach, it, expect, vi } from 'vitest';
import { initialState } from '@/lib/domain';
const mocks = vi.hoisted(() => ({ requireUser: vi.fn(), adminClient: vi.fn() }));
vi.mock('server-only', () => ({}));
vi.mock('@/lib/db/server', () => mocks);
import { readState } from '@/lib/db/state';
const user = '10000000-0000-4000-8000-000000000001';
let profile: Record<string, unknown>;
const oldDay = { date: '2026-01-01', goal: 1, words: ['reluctant'], completed: [], started: true };
let queriedOld = false;
beforeEach(() => {
  profile = { settings: initialState().settings, revision: 3, workspace: initialState().workspace };
  queriedOld = false;
  const db = {
    from: (table: string) => {
      const query = {
        select: () => query,
        eq: (column: string, value: string) => {
          if (column === 'id' || column === 'user_id') expect(value).toBe(user);
          if (column === 'day') {
            expect(value).toBe(oldDay.date);
            queriedOld = true;
          }
          return query;
        },
        order: () => query,
        limit: async () => ({ data: [], error: null }),
        range: async () => ({ data: [], error: null }),
        maybeSingle: async () => ({
          data: table === 'profiles' ? profile : { data: oldDay },
          error: null,
        }),
      };
      return query;
    },
    rpc: async () => ({
      data: {
        reviews: 0,
        accuracy: 0,
        xp: 0,
        streak: 0,
        longest: 0,
        completedDays: 0,
        activity: {},
      },
      error: null,
    }),
  };
  mocks.requireUser.mockResolvedValue({ user: { id: user, user_metadata: {} }, db });
});
it('round-trips the private workspace without relying on browser storage', async () => {
  profile.workspace = {
    sessions: {},
    inbox: [{ id: 'capture', word: 'feasible', context: 'Private context', at: '2026-09-13' }],
    usage: [],
  };
  const result = await readState();
  expect(result.state.workspace).toEqual(profile.workspace);
  expect(result.state.version).toBe(3);
  expect(result.userId).toBe(user);
});
it('loads the original daily set when a draft predates the dashboard history window', async () => {
  profile.workspace = { sessions: { learn: { day: oldDay.date } }, inbox: [], usage: [] };
  const result = await readState();
  expect(queriedOld).toBe(true);
  expect(result.state.days).toContainEqual(oldDay);
});
it('reports a missing migration rather than pretending drafts will persist', async () => {
  delete profile.workspace;
  await expect(readState()).rejects.toThrow('003_vocabulary_practice.sql');
});
