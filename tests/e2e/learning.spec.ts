import { test, expect } from '@playwright/test';
test('a personal word completes a full lesson and enters review', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('combobox').selectOption('1');
  await page.getByRole('button', { name: 'Let’s begin' }).click();
  await page.goto('/add');
  await page.getByLabel('What’s the word?').fill('reluctant');
  await page.getByRole('button', { name: 'Build word card' }).click();
  await expect(page.getByRole('heading', { name: 'reluctant', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Save & add to today' }).click();
  await expect(page.getByText('This word is already in your collection.')).toBeVisible();
  await page.goto('/learn');
  await page.getByRole('button', { name: 'Start lesson', exact: true }).click();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page
    .getByRole('button', { name: 'A not willing or not very eager to do something' })
    .click();
  await page.getByRole('button', { name: 'Check answer' }).click();
  await expect(page.getByText('That’s it. Nicely done.')).toBeVisible();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.getByRole('button', { name: 'B reluctant', exact: true }).click();
  await page.getByRole('button', { name: 'Check answer' }).click();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.getByRole('button', { name: /B Hesitant means/ }).click();
  await page.getByRole('button', { name: 'Check answer' }).click();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.getByLabel('Type the word').fill('reluctant');
  await page.getByRole('button', { name: 'Check answer' }).click();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.getByLabel('Your own sentence').fill('I was reluctant to leave my friends.');
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.getByRole('button', { name: /C You can do it/ }).click();
  await page.getByRole('button', { name: 'Check answer' }).click();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.getByLabel('I know it well').check();
  await page.getByRole('button', { name: 'Save & continue' }).click();
  await expect(page.getByRole('heading', { name: 'These words are yours.' })).toBeVisible();
  await page.goto('/review');
  await expect(page.getByRole('heading', { name: 'You’re all caught up.' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'reluctant', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Practice', exact: true }).click();
  await page.getByLabel('Type the word').fill('wrong');
  await page.getByRole('button', { name: 'Check answer' }).click();
  await expect(page.getByText('A useful one to revisit.')).toBeVisible();
});
test('suggestions, duplicate protection, settings and collection persist', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Skip', exact: true }).click();
  await page.goto('/suggested');
  await page.getByRole('button', { name: 'Add to today', exact: true }).first().click();
  await expect(page.getByText('1 of 5 words selected')).toBeVisible();
  await page.reload();
  await expect(page.getByText('1 of 5 words selected')).toBeVisible();
  await page
    .getByRole('button', { name: /Save .* for later/ })
    .first()
    .click();
  await page.getByRole('button', { name: 'My saved words', exact: true }).click();
  await page.getByRole('button', { name: 'Add to today', exact: true }).first().click();
  await expect(page.getByText('2 of 5 words selected')).toBeVisible();
  await page.goto('/collection');
  await expect(page.locator('.library-row')).toHaveCount(2);
  await page.goto('/settings');
  await page.getByLabel('Daily word goal').fill('3');
  await page.getByRole('button', { name: 'Save settings', exact: true }).click();
  await page.goto('/');
  await expect(page.getByText(/1 slot remaining/)).toBeVisible();
});
test('all app surfaces render without client errors or mobile overflow', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  for (const route of [
    '/',
    '/suggested',
    '/add',
    '/collection',
    '/learn',
    '/review',
    '/progress',
    '/settings',
    '/install',
    '/privacy',
    '/login',
  ]) {
    await page.goto(route);
    await expect(page.locator('h1,h2').first()).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),
    ).toBeTruthy();
  }
  expect(errors).toEqual([]);
});
test('production email sign-in when service credentials are provided', async ({ page }) => {
  test.skip(
    !process.env.E2E_EMAIL ||
      !process.env.E2E_PASSWORD ||
      process.env.NEXT_PUBLIC_DEMO_MODE !== 'false',
    'Requires a configured real Supabase account and demo mode disabled.',
  );
  await page.goto('/login');
  await page.getByLabel('Email', { exact: true }).fill(process.env.E2E_EMAIL!);
  await page.getByLabel('Password', { exact: true }).fill(process.env.E2E_PASSWORD!);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page).toHaveURL('/');
});

test('default five slots can be filled, replaced, and locked', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Skip', exact: true }).click();
  await page.goto('/suggested');
  for (let i = 1; i <= 5; i++) {
    await page.getByRole('button', { name: 'Add to today', exact: true }).first().click();
    await expect(page.getByText(`${i} of 5 words selected`)).toBeVisible();
  }
  await expect(
    page.getByRole('button', { name: 'Add to today', exact: true }).first(),
  ).toBeDisabled();
  await page.goto('/');
  await page
    .getByRole('button', { name: /Remove .* from today/ })
    .first()
    .click();
  await expect(page.getByText(/1 slot remaining/)).toBeVisible();
  await page.goto('/suggested');
  await page.getByRole('button', { name: 'Add to today', exact: true }).first().click();
  await page.goto('/learn');
  await page.getByRole('button', { name: 'Start lesson', exact: true }).click();
  await expect(page.getByText(/01 \/ 8 · Discover/)).toBeVisible();
  await page.goto('/suggested');
  await expect(page.getByText('Lesson started — your set is locked')).toBeVisible();
});

test('PWA assets and offline fallback are usable', async ({ page, context, request }) => {
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Skip', exact: true })).toBeVisible();
  const manifest = await request.get('/manifest.webmanifest');
  expect(manifest.ok()).toBeTruthy();
  expect((await manifest.json()).display).toBe('standalone');
  for (const asset of ['/icon-192.png', '/icon-512.png', '/apple-touch-icon.png'])
    expect((await request.get(asset)).ok()).toBeTruthy();
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await context.setOffline(true);
  await page.goto('/install');
  await expect(page.getByRole('heading', { name: 'A little pause in the loop.' })).toBeVisible();
  await context.setOffline(false);
});

test('capture the verified daily surface', async ({ page }, testInfo) => {
  test.skip(process.env.E2E_SCREENSHOTS !== 'true', 'Optional visual artifact generation.');
  await page.goto('/');
  await page.getByRole('button', { name: 'Skip', exact: true }).click();
  await page.screenshot({
    path: `docs/screens/${testInfo.project.name}-today.png`,
    fullPage: true,
  });
});

test('some context exercises ask for typed production', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('combobox').selectOption('1');
  await page.getByRole('button', { name: 'Let’s begin' }).click();
  await page.goto('/add');
  await page.getByLabel('What’s the word?').fill('feasible');
  await page.getByRole('button', { name: 'Build word card' }).click();
  await page.getByRole('button', { name: 'Save & add to today' }).click();
  await expect(page.getByText('This word is already in your collection.')).toBeVisible();
  await page.goto('/learn');
  await page.getByRole('button', { name: 'Start lesson', exact: true }).click();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.getByRole('button', { name: /A possible to do successfully/ }).click();
  await page.getByRole('button', { name: 'Check answer' }).click();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Complete the thought.' })).toBeVisible();
  await page.getByLabel('Type the word').fill('feasible');
  await page.getByRole('button', { name: 'Check answer' }).click();
  await expect(page.getByText('That’s it. Nicely done.')).toBeVisible();
});
