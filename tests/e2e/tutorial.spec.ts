import { test, expect } from '@playwright/test';

test('optional guides explain each page and remember the user’s choice', async ({ page }, info) => {
  await page.goto('/');
  await expect(page.getByRole('region', { name: 'Today tutorial' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Show me how' }).click();
  const guide = page.getByRole('region', { name: 'Today tutorial' });
  await expect(guide).toBeVisible();
  await expect(guide.getByRole('heading', { name: 'Build your daily loop' })).toBeVisible();
  await guide.getByRole('button', { name: 'Next tip' }).click();
  await expect(guide.getByRole('heading', { name: 'Fill your word slots' })).toBeVisible();
  await guide.getByRole('button', { name: 'Back tip' }).click();
  await expect(guide.getByRole('heading', { name: 'Build your daily loop' })).toBeVisible();
  await guide.getByRole('button', { name: 'Find your way around' }).click();
  await guide.getByRole('button', { name: 'Got it, let’s try' }).click();
  await expect(guide.getByRole('button', { name: 'Open guide' })).toBeVisible();
  await guide.getByRole('button', { name: 'Open guide' }).click();
  await expect(guide.getByRole('heading', { name: 'Build your daily loop' })).toBeVisible();
  for (const [path, name] of [
    ['/suggested', 'Discover'],
    ['/add', 'Add a word'],
    ['/collection', 'My words'],
    ['/learn', 'Your lesson'],
    ['/review', 'Review'],
    ['/progress', 'Progress'],
    ['/settings', 'Settings'],
  ]) {
    await page.goto(path);
    await expect(page.getByRole('region', { name: `${name} tutorial`, exact: true })).toBeVisible();
  }
  const toggle = page.getByRole('switch', { name: 'Learning tips' });
  await expect(toggle).toBeChecked();
  await toggle.focus();
  await page.keyboard.press('Space');
  await expect(toggle).not.toBeChecked();
  await page.reload();
  await expect(page.getByRole('region', { name: 'Settings tutorial' })).toHaveCount(0);
  await page.getByRole('switch', { name: 'Learning tips' }).click();
  await expect(page.getByRole('region', { name: 'Settings tutorial' })).toBeVisible();
  await page.goto('/');
  await page.screenshot({ path: info.outputPath('learning-guide.png'), fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole('button', { name: 'Turn off tips' }).click();
  await expect(page.getByRole('region', { name: 'Today tutorial' })).toHaveCount(0);
});

test('declining tips stays quiet, including at narrow widths', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto('/');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole('button', { name: 'No thanks' }).click();
  await page.reload();
  await expect(page.getByRole('button', { name: 'Show me how' })).toHaveCount(0);
  await page.goto('/settings');
  await page.getByRole('switch', { name: 'Learning tips' }).click();
  await expect(page.getByRole('region', { name: 'Settings tutorial' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('tips work without persistent storage and fit dark appearance', async ({ page }, info) => {
  await page.addInitScript(() => {
    const get = Storage.prototype.getItem;
    const set = Storage.prototype.setItem;
    Storage.prototype.getItem = function (key) {
      if (key === 'lexiloop.learning-tips.v1') throw new Error('Storage unavailable');
      return get.call(this, key);
    };
    Storage.prototype.setItem = function (key, value) {
      if (key === 'lexiloop.learning-tips.v1') throw new Error('Storage unavailable');
      return set.call(this, key, value);
    };
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Show me how' }).click();
  await expect(page.getByRole('region', { name: 'Today tutorial' })).toBeVisible();
  await page.evaluate(() => {
    document.documentElement.dataset.theme = 'dark';
    document.documentElement.dataset.motion = 'reduce';
  });
  await page
    .getByRole('region', { name: 'Today tutorial' })
    .screenshot({ path: info.outputPath('guide-dark.png') });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole('button', { name: 'Turn off tips' }).click();
  await expect(page.getByRole('region', { name: 'Today tutorial' })).toHaveCount(0);
});
