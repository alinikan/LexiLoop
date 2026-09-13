import { defineConfig } from '@playwright/test';
const baseURL = process.env.E2E_BASE_URL;
if (!baseURL || !process.env.E2E_EMAIL || !process.env.E2E_PASSWORD)
  throw new Error(
    'Live sign-in requires E2E_BASE_URL, E2E_EMAIL and E2E_PASSWORD from your private shell environment.',
  );
if (new URL(baseURL).protocol !== 'https:')
  throw new Error('Live sign-in requires an HTTPS app URL.');
export default defineConfig({
  testDir: 'tests/e2e',
  testMatch: 'live-auth.spec.ts',
  workers: 1,
  use: { baseURL, trace: 'off', screenshot: 'off', video: 'off' },
});
