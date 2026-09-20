import { beforeEach, expect, it, vi } from 'vitest';
import { catalog } from '@/data/catalog';
import { UserError } from '@/lib/errors';

const mocks = vi.hoisted(() => ({ requireUser: vi.fn(), range: vi.fn(), one: vi.fn() }));
vi.mock('server-only', () => ({}));
vi.mock('@/lib/db/server', () => ({ requireUser: mocks.requireUser }));

import { GET as listCatalog } from '@/app/api/catalog/route';
import { GET as catalogWord } from '@/app/api/catalog/[word]/route';
import { GET as catalogNames } from '@/app/api/catalog/names/route';

function database() {
  return {
    from: vi.fn(() => {
      const query = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        ilike: vi.fn().mockReturnThis(),
        contains: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        range: mocks.range,
        maybeSingle: mocks.one,
      };
      return query;
    }),
  };
}

beforeEach(() => {
  vi.resetAllMocks();
  mocks.requireUser.mockResolvedValue({ user: { id: 'user' }, db: database() });
});

it('returns a small searchable catalog page instead of full lesson JSON', async () => {
  const word = catalog[0];
  mocks.range.mockResolvedValue({
    data: [
      {
        word: word.word,
        part_of_speech: word.partOfSpeech,
        difficulty: word.difficulty,
        usefulness: word.usefulness,
        categories: word.categories,
        definition: word.meanings[0].definition,
        frequency_rank: 1,
      },
    ],
    count: 5000,
    error: null,
  });
  const response = await listCatalog(
    new Request('https://lexiloop.test/api/catalog?q=reluctant&limit=24'),
  );
  const body = await response.json();
  expect(response.status).toBe(200);
  expect(body.total).toBe(5000);
  expect(body.items[0]).toEqual(
    expect.objectContaining({ word: word.word, definition: word.meanings[0].definition }),
  );
  expect(JSON.stringify(body)).not.toContain('exercises');
});

it('loads one complete lesson lazily by normalized word', async () => {
  mocks.one.mockResolvedValue({ data: { content: catalog[0] }, error: null });
  const response = await catalogWord(new Request('https://lexiloop.test'), {
    params: Promise.resolve({ word: catalog[0].word.toUpperCase() }),
  });
  expect((await response.json()).word.exercises).toHaveLength(4);
});

it('returns the compact spelling index and requires authentication', async () => {
  mocks.range.mockResolvedValue({ data: [{ word: 'clarify' }, { word: 'touché' }], error: null });
  expect(await (await catalogNames()).json()).toEqual({ names: ['clarify', 'touché'] });
  mocks.requireUser.mockRejectedValue(new UserError('Please sign in to continue.'));
  expect((await listCatalog(new Request('https://lexiloop.test/api/catalog'))).status).toBe(401);
});
