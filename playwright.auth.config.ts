import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir: 'tests/e2e',
  testMatch: 'auth-ui.spec.ts',
  fullyParallel: false,
  workers: 1,
  reporter: 'list',
  outputDir: 'test-results/auth',
  use: { baseURL: 'http://127.0.0.1:4173', trace: 'retain-on-failure' },
  projects: [
    { name: 'account-desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'account-tablet', use: { viewport: { width: 768, height: 1024 } } },
    { name: 'account-mobile', use: { ...devices['iPhone 13'], defaultBrowserType: 'chromium' } },
  ],
  webServer: {
    command: 'node scripts/test-server.mjs account',
    url: 'http://127.0.0.1:4173/login',
    reuseExistingServer: false,
    timeout: 120000,
  },
});
