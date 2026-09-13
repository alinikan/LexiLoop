import { test, expect } from '@playwright/test';
// Explicit opt-in only. No screenshots/traces containing a real account session.
test('an existing confirmed account can sign in to the live deployment', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Email', { exact: true }).fill(process.env.E2E_EMAIL!);
  await page.getByLabel('Password', { exact: true }).fill(process.env.E2E_PASSWORD!);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page).toHaveURL(new URL('/', process.env.E2E_BASE_URL!).href);
  await expect(page.locator('.daily-hero')).toBeVisible();
  await page.goto('/settings');
  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  await expect(page).toHaveURL(new URL('/login', process.env.E2E_BASE_URL!).href);
});
