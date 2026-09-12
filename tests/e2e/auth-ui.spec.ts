import { test, expect } from '@playwright/test';
test('account forms handle confirmation, invalid credentials and reset requests on a narrow phone', async ({
  page,
}) => {
  test.skip(
    process.env.E2E_AUTH_UI !== 'true',
    'Requires an account-mode build; API replies are fixtures, not real email delivery.',
  );
  await page.setViewportSize({ width: 320, height: 720 });
  await page.route('**/api/auth', async (route) => {
    const body = route.request().postDataJSON();
    await route.fulfill({
      status: body.action === 'signin' ? 400 : 200,
      contentType: 'application/json',
      body: JSON.stringify(
        body.action === 'signin'
          ? { error: 'Sign-in failed. Check your email and password.' }
          : body.action === 'signup'
            ? { confirmation: true }
            : {
                message: 'If this email has an account, a password reset link will arrive shortly.',
              },
      ),
    });
  });
  await page.goto('/login');
  await page.getByRole('button', { name: 'New here? Create an account' }).click();
  await page.getByLabel('Display name (optional)').fill('A learner');
  await page.getByLabel('Email', { exact: true }).fill('learner@example.com');
  await page.getByLabel('Password', { exact: true }).fill('long unique passphrase');
  await page.getByLabel('Confirm password', { exact: true }).fill('different passphrase');
  await page.getByRole('button', { name: 'Create account', exact: true }).click();
  await expect(page.locator('.form-error')).toHaveText('Passwords must match.');
  await page.getByLabel('Confirm password', { exact: true }).fill('long unique passphrase');
  await page.getByRole('button', { name: 'Show password', exact: true }).click();
  await expect(page.getByLabel('Password', { exact: true })).toHaveAttribute('type', 'text');
  await page.getByRole('button', { name: 'Create account', exact: true }).click();
  await expect(
    page.getByText('Check your inbox to confirm your email, then come back and sign in.'),
  ).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: 'docs/screens/auth-confirmation-320.png', fullPage: true });
  await page.getByRole('button', { name: 'Already have an account? Sign in' }).click();
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.locator('.form-error')).toContainText('Sign-in failed');
  await page.getByRole('link', { name: 'Forgot password?' }).click();
  await expect(page.getByRole('heading', { name: 'Find your way back.' })).toBeVisible();
  await page.getByLabel('Email', { exact: true }).fill('learner@example.com');
  await page.getByRole('button', { name: 'Send reset link' }).click();
  await expect(page.getByRole('status')).toContainText('If this email has an account');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
