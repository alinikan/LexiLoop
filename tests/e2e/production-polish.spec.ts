import { finishMixed } from './mixed-helper';
import { test, expect } from '@playwright/test';
import { catalog } from '../../data/catalog';
import type { State } from '../../lib/domain';
for (const width of [320, 375, 390, 393, 414, 430, 768, 1440]) {
  test(`daily ring stays inside its card at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');
    await page.getByRole('button', { name: 'Skip', exact: true }).click();
    const hero = await page.locator('.daily-hero').boundingBox();
    const ring = await page.locator('.loop-visual').boundingBox();
    expect(hero).toBeTruthy();
    expect(ring).toBeTruthy();
    expect(ring!.x).toBeGreaterThanOrEqual(hero!.x);
    expect(ring!.x + ring!.width).toBeLessThanOrEqual(hero!.x + hero!.width);
    expect(ring!.y).toBeGreaterThanOrEqual(hero!.y);
    expect(ring!.y + ring!.height).toBeLessThanOrEqual(hero!.y + hero!.height);
    const label = await page.locator('.loop-visual small').boundingBox();
    if (label) {
      expect(label.x).toBeGreaterThanOrEqual(ring!.x + ring!.width * 0.12);
      expect(label.x + label.width).toBeLessThanOrEqual(ring!.x + ring!.width * 0.88);
      expect(label.y).toBeGreaterThanOrEqual(ring!.y + ring!.height * 0.12);
      expect(label.y + label.height).toBeLessThanOrEqual(ring!.y + ring!.height * 0.88);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  });
}
test('three personal and two suggested words finish a daily loop and due review persists', async ({
  page,
}) => {
  test.setTimeout(90000);
  await page.clock.install({ time: new Date('2026-09-12T12:00:00Z') });
  await page.goto('/');
  await page.getByRole('button', { name: 'Skip', exact: true }).click();
  for (const word of ['reluctant', 'feasible', 'clarify']) {
    await page.goto('/add');
    await page.getByLabel('What’s the word?').fill(word);
    await page.getByRole('button', { name: 'Build word card' }).click();
    await expect(page.getByRole('link', { name: /Open in Cambridge Dictionary/ })).toBeVisible();
    await page.getByRole('button', { name: 'Save & add to today' }).click();
    await expect(page.getByText('This word is already in your collection.')).toBeVisible();
  }
  await page.goto('/suggested');
  for (let n = 4; n <= 5; n++) {
    await page.getByRole('button', { name: 'Add to today', exact: true }).first().click();
    await expect(page.getByText(`${n} of 5 words selected`)).toBeVisible();
  }
  const read = () =>
    page.evaluate<State>(() => JSON.parse(localStorage.getItem('lexiloop-demo-v1')!).state);
  const before = await read();
  const names = before.days.at(-1)!.words;
  expect(before.words.filter((w) => w.source === 'personal')).toHaveLength(3);
  await page.goto('/learn');
  await page.getByRole('button', { name: 'Start lesson', exact: true }).click();
  expect(names).toHaveLength(5);
  await finishMixed(page);
  await expect(page.getByRole('heading', { name: 'These words are yours.' })).toBeVisible();
  await page.reload();
  const learned = await read();
  expect(learned.days.at(-1)!.completed).toHaveLength(5);
  expect(learned.events).toHaveLength(5);
  await page.clock.setFixedTime(new Date('2026-09-13T13:00:00Z'));
  await page.goto('/review');
  await expect(
    page.getByRole('heading', { name: '5 words are ready for another loop.' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Quick review · 5 words' }).click();
  await page.getByLabel('Type the word').fill('incorrect');
  await page.getByRole('button', { name: 'Check answer' }).click();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  const reviewWord = learned.words.toSorted((a, b) =>
    a.schedule.nextReview!.localeCompare(b.schedule.nextReview!),
  )[0].word;
  const context = catalog
    .find((word) => word.word === reviewWord)!
    .exercises.find((exercise) => exercise.type === 'context')!;
  if (await page.getByLabel('Type the word').isVisible()) {
    await page.getByLabel('Type the word').fill(reviewWord);
  } else {
    await page.locator('.answer-options button').nth(context.answer).click();
  }
  await page.getByRole('button', { name: 'Check answer', exact: true }).click();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.getByLabel('I know it well').check();
  await page.getByRole('button', { name: 'Save & continue', exact: true }).click();
  await page.reload();
  const reviewed = await read();
  expect(reviewed.events).toHaveLength(6);
  expect(reviewed.words.find((w) => w.word === reviewWord)!.schedule.interval).toBeCloseTo(
    10 / 1440,
  );
});

test('narrow phone screens support forms, dark mode and all navigation without overflow', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'One cross-width visual matrix is sufficient.');
  test.setTimeout(90000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  for (const width of [320, 375, 390, 393, 414, 430]) {
    await page.setViewportSize({ width, height: 844 });
    for (const route of [
      '/',
      '/add',
      '/suggested',
      '/collection',
      '/learn',
      '/review',
      '/progress',
      '/settings',
      '/login',
      '/forgot-password',
      '/install',
    ]) {
      await page.goto(route);
      await expect(page.locator('h1,h2').first()).toBeVisible();
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),
        `${route} at ${width}px`,
      ).toBe(true);
    }
  }
  await page.goto('/settings');
  await page.getByLabel('Dark appearance').check();
  await page.getByLabel('Reduce motion', { exact: true }).check();
  await page.getByRole('button', { name: 'Save settings', exact: true }).click();
  await page.locator('.bottom-nav').getByRole('link', { name: 'Today' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(page.locator('html')).toHaveAttribute('data-motion', 'reduce');
  await expect(page.getByText(/Opening your word/i)).toHaveCount(0);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  expect(
    await page.locator('body').evaluate((body) => getComputedStyle(body).backgroundColor),
  ).toBe('rgb(20, 24, 39)');
  expect(errors).toEqual([]);
});
