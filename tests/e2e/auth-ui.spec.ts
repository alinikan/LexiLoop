import { test, expect } from '@playwright/test';
import { initialState, applyCommand } from '../../lib/domain';
import { catalog } from '../../data/catalog';
test('account forms handle confirmation, invalid credentials and reset requests on a narrow phone', async ({
  page,
}) => {
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
  await page.screenshot({ path: 'test-results/auth-confirmation-320.png', fullPage: true });
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

test('account routes support login, recovery, password change and logout against local Auth fixtures', async ({
  page,
  context,
}) => {
  // The real Next.js auth route and SSR cookies run; only the upstream Auth service is local.
  const state = initialState();
  state.settings.onboarded = true;
  await page.route('**/api/state', (route) => route.fulfill({ json: { state, catalog } }));
  await page.goto('/');
  await expect(page).toHaveURL(/\/login$/);
  await page.getByLabel('Email', { exact: true }).fill('learner@example.com');
  await page.getByLabel('Password', { exact: true }).fill('long test passphrase');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page).toHaveURL(/:4173\/$/);
  await expect(page.getByRole('heading', { name: /A few words/, level: 1 })).toBeVisible();
  expect(
    (await context.cookies()).some(
      (c) => c.name.includes('auth-token') && c.httpOnly && c.sameSite === 'Lax',
    ),
  ).toBe(true);
  await page.goto('/settings');
  await page.route('**/api/auth', (route) => route.abort('internetdisconnected'));
  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Sign-out failed');
  await page.unroute('**/api/auth');
  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  await expect(page).toHaveURL(/\/login$/);
  await page.goto('/reset-password');
  await expect(page).toHaveURL(/confirmation=failed/);
  await page.goto('/auth/confirm?token_hash=expired&type=recovery');
  await expect(page.locator('.form-error')).toContainText('invalid or expired');
  await page.goto('/auth/confirm?token_hash=fixture&type=recovery');
  await expect(page).toHaveURL(/\/reset-password$/);
  await page.getByLabel('New password', { exact: true }).fill('a changed test passphrase');
  await page.getByLabel('Confirm new password', { exact: true }).fill('a changed test passphrase');
  await page.getByRole('button', { name: 'Update password' }).click();
  await expect(page.getByRole('status')).toContainText('Password updated');
  await page.getByRole('link', { name: 'Sign in', exact: true }).click();
  await page.getByLabel('Email', { exact: true }).fill('learner@example.com');
  await page.getByLabel('Password', { exact: true }).fill('a changed test passphrase');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page).toHaveURL(/:4173\/$/);
  // Restore the fixture password for the next viewport project.
  await page.request.post('/api/auth', {
    headers: { origin: 'http://127.0.0.1:4173' },
    data: {
      action: 'reset',
      password: 'long test passphrase',
      confirmPassword: 'long test passphrase',
    },
  });
});

test('account forms have labeled controls, keyboard focus and responsive error states', async ({
  page,
}) => {
  await page.goto('/login');
  await page.getByLabel('Email', { exact: true }).focus();
  await expect(page.getByLabel('Email', { exact: true })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.getByLabel('Password', { exact: true })).toBeFocused();
  await page.getByRole('button', { name: 'New here? Create an account' }).click();
  await page.getByLabel('Email', { exact: true }).fill('invalid');
  await page.getByLabel('Password', { exact: true }).fill('short');
  await page.getByLabel('Confirm password', { exact: true }).fill('short');
  await page.getByRole('button', { name: 'Create account', exact: true }).click();
  expect(
    await page
      .getByLabel('Email', { exact: true })
      .evaluate((el: HTMLInputElement) => el.validity.typeMismatch),
  ).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: test.info().outputPath('account-form.png'), fullPage: true });
});

test('account draft saves survive another page and failed writes show retry', async ({
  page,
  context,
}) => {
  // Same account state fixture is served to both pages; no browser-local lesson storage.
  let state = initialState();
  state.settings.onboarded = true;
  state = applyCommand(state, { type: 'daily-plan', words: ['reluctant'] }, catalog);
  let fail = false;
  await context.route('**/api/state', async (route) => {
    if (route.request().method() === 'POST') {
      if (fail) return route.fulfill({ status: 503, json: { error: 'Fixture save unavailable' } });
      const body = route.request().postDataJSON();
      if (body.version !== state.version)
        return route.fulfill({ status: 409, json: { error: 'Version conflict' } });
      state = applyCommand(state, body.command, catalog);
    }
    return route.fulfill({ json: { state, catalog } });
  });
  await page.goto('/login');
  await page.getByLabel('Email', { exact: true }).fill('learner@example.com');
  await page.getByLabel('Password', { exact: true }).fill('long test passphrase');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page).toHaveURL(/:4173\/$/);
  await page.goto('/learn');
  await page.getByRole('button', { name: 'Start lesson', exact: true }).click();
  await expect(page.locator('.session-save')).toContainText('Your place is saved');
  fail = true;
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.locator('.answer-options button').first().click();
  await expect(page.locator('.session-save')).toContainText('Not saved yet');
  fail = false;
  await page.getByRole('button', { name: 'Retry save', exact: true }).click();
  await expect(page.locator('.session-save')).toContainText('Your place is saved');
  const second = await context.newPage();
  await second.goto('/learn');
  await second.getByRole('button', { name: 'Resume saved lesson', exact: true }).click();
  await expect(second.locator('.answer-options button').first()).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  expect(await second.evaluate(() => localStorage.getItem('lexiloop-demo-v1'))).toBeNull();
  await second.close();
});
