import { test, expect } from '@playwright/test';
import { catalog } from '../../data/catalog';
import { initialState, applyCommand } from '../../lib/domain';
import { finishMixed } from './mixed-helper';
test('search crosses both sources and settings actually filter recommendations', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Skip', exact: true }).click();
  await page.goto('/suggested');
  await expect(page.locator('.word-meta').first()).toContainText('B1');
  await page.getByLabel('Find a word across suggested and saved words').fill('obfuscate');
  await page.locator('.discovery-open').click();
  await expect(
    page.getByRole('heading', { name: 'Meaning, examples, and real-life use' }),
  ).toBeVisible();
  await expect(page.getByText('Our Simple Explanation')).toBeVisible();
  await page.getByRole('button', { name: 'Close word details' }).click();
  await page.getByRole('button', { name: 'Save obfuscate for later' }).click();
  await expect(page.getByRole('heading', { name: 'obfuscate', exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'In My Saved Words' })).toBeVisible();
  await page.getByRole('button', { name: 'My saved words', exact: true }).click();
  await page.getByLabel('Find a word across suggested and saved words').fill('serendipity');
  await expect(page.getByRole('heading', { name: 'serendipity', exact: true })).toBeVisible();
  await page.goto('/settings');
  await page.getByLabel('Vocabulary level').selectOption('C1');
  await page.getByRole('button', { name: 'Save settings', exact: true }).click();
  await page.goto('/suggested');
  for (const meta of await page.locator('.word-meta').all()) await expect(meta).toContainText('C1');
  await expect(page.getByRole('button', { name: 'Show more words' })).toBeVisible();
  await page.goto('/collection?word=obfuscate');
  await expect(page.getByText('Picture it on screen · an original mini-scene')).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Out in the real world' }).first()).toBeVisible();
  page.once('dialog', (d) => d.accept());
  await page.getByRole('button', { name: 'Remove from My Words', exact: true }).click();
  await page.reload();
  await expect(page.locator('.library-row')).toHaveCount(0);
});
test('five introductions precede mixed practice of fifteen words and survive reload', async ({
  page,
}) => {
  test.setTimeout(120000);
  const now = new Date('2026-09-13T12:00:00Z');
  await page.clock.install({ time: now });
  let state = initialState();
  state.settings.onboarded = true;
  for (const word of catalog.slice(0, 10)) {
    state = applyCommand(
      state,
      { type: 'save', word: word.word, source: 'personal' },
      catalog,
      now,
    );
    state.words.at(-1)!.schedule.firstLearned = '2026-09-10T12:00:00Z';
  }
  const names = catalog.slice(10, 15).map((w) => w.word);
  state = applyCommand(state, { type: 'daily-plan', words: names }, catalog, now);
  await page.addInitScript(
    ({ state, catalog }) => {
      if (!localStorage.getItem('lexiloop-demo-v1'))
        localStorage.setItem('lexiloop-demo-v1', JSON.stringify({ state, catalog }));
    },
    { state, catalog },
  );
  await page.goto('/learn');
  await page.getByRole('button', { name: 'Start lesson', exact: true }).click();
  for (const name of names) {
    await expect(page.getByRole('heading', { name, exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Check answer' })).toHaveCount(0);
    await page.getByRole('button', { name: 'Continue', exact: true }).click();
  }
  await expect(page.getByText(/Mixed practice · 15 words/)).toBeVisible();
  await expect(page.locator('.session-save')).toContainText('Your place is saved');
  await page.reload();
  await page.getByRole('button', { name: 'Resume saved lesson', exact: true }).click();
  await finishMixed(page);
  const result = await page.evaluate(
    () => JSON.parse(localStorage.getItem('lexiloop-demo-v1')!).state,
  );
  expect(result.events).toHaveLength(15);
  expect(result.days.at(-1).completed).toHaveLength(5);
});

test('the exercise tip appears even after dismissing the introduction tip', async ({ page }) => {
  const now = new Date('2026-09-13T12:00:00Z');
  await page.clock.install({ time: now });
  const state = applyCommand(
    initialState(),
    { type: 'daily-plan', words: ['reluctant'] },
    catalog,
    now,
  );
  state.settings.onboarded = true;
  await page.addInitScript(
    ({ state, catalog }) => {
      localStorage.setItem('lexiloop-demo-v1', JSON.stringify({ state, catalog }));
      localStorage.setItem('lexiloop.learning-tips.v1', 'on');
    },
    { state, catalog },
  );
  await page.goto('/learn');
  await page.getByRole('button', { name: 'Start lesson', exact: true }).click();
  await page
    .getByRole('complementary', { name: 'Meet the words before testing yourself' })
    .getByRole('button', { name: 'Got it' })
    .click();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await expect(
    page.getByRole('complementary', { name: 'Connect your growing vocabulary' }),
  ).toBeVisible();
  await expect(page.locator('.lesson-card')).toBeFocused();
});

test('an expanded library card can be found, learned, and saved', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('combobox').selectOption('1');
  await page.getByRole('button', { name: 'Let’s begin' }).click();
  await page.goto('/suggested');
  await expect(page.getByText(/library of 401 words/)).toBeVisible();
  await page.getByLabel('Find a word across suggested and saved words').fill('equanimity');
  await expect(page.getByRole('heading', { name: 'equanimity', exact: true })).toBeVisible();
  await expect(
    page.getByText('calmness and emotional balance during difficulty', { exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Add to today', exact: true }).click();
  await page.goto('/learn');
  await page.getByRole('button', { name: 'Start lesson', exact: true }).click();
  await finishMixed(page);
  await page.goto('/collection?word=equanimity');
  await expect(page.getByRole('heading', { name: 'equanimity', exact: true })).toBeVisible();
  await page.reload();
  const state = await page.evaluate(
    () => JSON.parse(localStorage.getItem('lexiloop-demo-v1')!).state,
  );
  expect(
    state.words.find((w: { word: string }) => w.word === 'equanimity').schedule.firstLearned,
  ).toBeTruthy();
  expect(state.events).toHaveLength(1);
});

test('accent variants, spelling suggestions, duplicate notices, and known words work together', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Skip', exact: true }).click();
  await page.goto('/add');
  await page.getByLabel('What’s the word?').fill('Touche');
  await expect(page.getByText(/“touché” already exists in LexiLoop/)).toBeVisible();
  await page.getByRole('button', { name: 'Build word card' }).click();
  await expect(page.getByRole('heading', { name: 'touché', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Save to my words' }).click();
  await page.goto('/add');
  await page.getByLabel('What’s the word?').fill('Touche');
  await expect(page.getByText(/already in My Words/)).toBeVisible();
  await page.getByLabel('What’s the word?').fill('relucatnt');
  await page.getByRole('button', { name: 'Build word card' }).click();
  await expect(page.getByText('Did you mean “reluctant”?')).toBeVisible();
  await page.getByRole('button', { name: 'Yes, use reluctant' }).click();
  await expect(page.getByRole('heading', { name: 'reluctant', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'I already know this word' }).click();
  await page.goto('/collection');
  await page.getByRole('combobox', { name: 'Filter collection' }).selectOption('Already know');
  await expect(page.getByRole('button', { name: 'View reluctant' })).toBeVisible();
});
