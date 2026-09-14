import { test, expect, type Page } from '@playwright/test';
import { initialState, applyCommand, type State } from '../../lib/domain';
import { catalog } from '../../data/catalog';
import { workspace } from '../../lib/practice';
const date = new Date('2026-09-13T12:00:00Z');
async function seed(page: Page, state: State) {
  await page.addInitScript(
    ({ state, catalog }) => {
      if (!localStorage.getItem('lexiloop-demo-v1'))
        localStorage.setItem('lexiloop-demo-v1', JSON.stringify({ state, catalog }));
    },
    { state, catalog },
  );
}
const read = (page: Page) =>
  page.evaluate<State>(() => JSON.parse(localStorage.getItem('lexiloop-demo-v1')!).state);
async function saved(page: Page) {
  await expect(page.locator('.session-save')).toContainText('Your place is saved');
}
function prepared() {
  const s = initialState();
  s.settings.onboarded = true;
  return applyCommand(s, { type: 'daily-plan', words: ['reluctant', 'concise'] }, catalog, date);
}

test('recommendations are optional, editable, and captures become personal cards', async ({
  page,
}, info) => {
  const state = initialState();
  state.settings.onboarded = true;
  await seed(page, state);
  await page.goto('/');
  const plan = page.getByRole('region', { name: 'Daily recommendations' });
  expect((await read(page)).words).toHaveLength(0);
  await plan.getByRole('button', { name: 'Preview my recommendations' }).click();
  for (const box of await plan.getByRole('checkbox').all())
    if (await box.isChecked()) await box.uncheck();
  await plan.getByRole('checkbox').nth(0).check();
  await plan.getByRole('checkbox').nth(1).check();
  await plan.getByRole('button', { name: 'Use these 2 words' }).click();
  await expect(page.getByRole('img', { name: '0 of 2 words completed' })).toBeVisible();
  await plan.getByRole('button', { name: 'Edit today’s set' }).click();
  await plan.locator('input[type=checkbox]:checked').first().uncheck();
  await plan.getByRole('button', { name: 'Cancel changes' }).click();
  expect((await read(page)).days.at(-1)?.words).toHaveLength(2);
  const inbox = page.getByRole('region', { name: 'Quick capture inbox' });
  await inbox.getByLabel('Word to capture').fill('feasible');
  await inbox.getByLabel('Context for later').fill('Is that feasible for our weekend trip?');
  await inbox.getByRole('button', { name: 'Save to inbox' }).click();
  await page.reload();
  await inbox.getByRole('link', { name: 'Build this word card' }).click();
  await expect(page.getByLabel('What’s the word?')).toHaveValue('feasible');
  await expect(page.getByLabel('The original sentence')).toHaveValue(
    'Is that feasible for our weekend trip?',
  );
  await page.getByRole('button', { name: 'Build word card' }).click();
  await page.getByRole('button', { name: 'Save to my words', exact: true }).click();
  await expect(page.getByText('This word is already in your collection.')).toBeVisible();
  expect(workspace(await read(page)).inbox).toHaveLength(0);
  await page.goto('/');
  await plan.screenshot({ path: info.outputPath('daily-recommendations.png') });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('a lesson resumes checked answers and unfinished typing across midnight', async ({ page }) => {
  await page.clock.install({ time: date });
  const state = initialState();
  state.settings.onboarded = true;
  await seed(
    page,
    applyCommand(state, { type: 'daily-plan', words: ['reluctant'] }, catalog, date),
  );
  await page.goto('/learn');
  await page.getByRole('button', { name: 'Start lesson', exact: true }).click();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.locator('.answer-options button').nth(0).click();
  await page.getByRole('button', { name: 'Check answer' }).click();
  await saved(page);
  await page.reload();
  await page.getByRole('button', { name: 'Resume saved lesson', exact: true }).click();
  await expect(page.locator('.answer-options button').nth(0)).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect(page.getByRole('button', { name: 'Check answer' })).toHaveCount(0);
  for (let n = 0; n < 2; n++) {
    await page.getByRole('button', { name: 'Continue', exact: true }).click();
    await page.locator('.answer-options button').first().click();
    await page.getByRole('button', { name: 'Check answer' }).click();
  }
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.getByLabel('Type the word').fill('reluc');
  await saved(page);
  await page.clock.setFixedTime(new Date('2026-09-14T12:00:00Z'));
  await page.reload();
  await page.getByRole('button', { name: 'Resume saved lesson', exact: true }).click();
  await expect(page.getByLabel('Type the word')).toHaveValue('reluc');
  await page.getByLabel('Type the word').fill('reluctant');
  await page.getByRole('button', { name: 'Check answer' }).click();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.getByLabel('Your own sentence').fill('I was reluctant to end our conversation.');
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.locator('.answer-options button').first().click();
  await page.getByRole('button', { name: 'Check answer' }).click();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.getByRole('button', { name: 'Save & continue' }).click();
  await expect(page.getByRole('heading', { name: 'These words are yours.' })).toBeVisible();
  const result = await read(page);
  expect(result.days.find((d) => d.date === '2026-09-13')?.completed).toEqual(['reluctant']);
  expect(result.events[0].date).toBe('2026-09-14');
  expect(workspace(result).sessions.learn).toBeUndefined();
});

test('review targets mistakes and reports measured recall separately from self-assessed usage', async ({
  page,
}, info) => {
  await page.clock.install({ time: new Date('2026-09-15T12:00:00Z') });
  let state = prepared();
  state = applyCommand(state, { type: 'start' }, catalog, date);
  state = applyCommand(
    state,
    {
      type: 'complete',
      word: 'reluctant',
      quality: 0,
      kind: 'learn',
      sentence: '',
      id: '92000000-0000-4000-8000-000000000001',
      evidence: [{ skill: 'distinction', correct: false }],
    },
    catalog,
    date,
  );
  await seed(page, state);
  await page.goto('/review?word=reluctant');
  await page.getByRole('button', { name: 'Start practice', exact: true }).click();
  await expect(page.getByText(/Extra practice for distinction/)).toBeVisible();
  await page.getByLabel('Type the word').fill('reluctant');
  await page.getByRole('button', { name: 'Check answer' }).click();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  const word = catalog.find((w) => w.word === 'reluctant')!;
  for (const skill of ['context', 'distinction']) {
    await page
      .locator('.answer-options button')
      .nth(word.exercises.find((e) => e.type === skill)!.answer)
      .click();
    await page.getByRole('button', { name: 'Check answer' }).click();
    await page.getByRole('button', { name: 'Continue', exact: true }).click();
  }
  await page.getByRole('button', { name: 'Save & continue' }).click();
  await expect(
    page.getByRole('heading', { name: 'Another loop, a little stronger.' }),
  ).toBeVisible();
  await page.goto('/');
  const usage = page.getByRole('region', { name: 'Use words together' });
  await usage.getByRole('button', { name: 'reluctant', exact: true }).click();
  await usage.getByRole('button', { name: 'concise', exact: true }).click();
  await usage.getByLabel('Your thought').fill('I was reluctant to give a concise reply.');
  await usage.getByLabel('After checking the meanings…').selectOption('ready');
  await usage.getByRole('button', { name: 'Save vocabulary practice' }).click();
  await page.goto('/progress');
  const memory = page.getByRole('region', { name: 'Memory evidence' });
  await expect(memory).toContainText('1/1');
  await expect(memory).toContainText('Self-reported');
  await memory.screenshot({ path: info.outputPath('memory-evidence.png') });
  expect(workspace(await read(page)).usage).toHaveLength(1);
});

test('contextual help is opt-in, dismissible and replayable', async ({ page }) => {
  await seed(page, prepared());
  await page.goto('/');
  await expect(page.getByRole('complementary', { name: 'You choose the final set' })).toHaveCount(
    0,
  );
  await page.getByRole('button', { name: 'Show me how' }).click();
  const tip = page.getByRole('complementary', { name: 'You choose the final set' });
  await expect(tip).toBeVisible();
  await tip.getByRole('button', { name: 'Got it', exact: true }).click();
  await page.reload();
  await expect(tip).toHaveCount(0);
  await page.goto('/settings');
  await page.getByRole('button', { name: 'Replay contextual tips' }).click();
  await page.goto('/');
  await expect(tip).toBeVisible();
});
