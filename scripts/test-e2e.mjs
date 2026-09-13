import { spawnSync } from 'node:child_process';
// Sequential servers use the same generated .next directory, never a running user server.
for (const config of ['playwright.config.ts', 'playwright.auth.config.ts']) {
  const result = spawnSync(
    process.execPath,
    ['node_modules/@playwright/test/cli.js', 'test', '--config', config],
    { stdio: 'inherit' },
  );
  if (result.status !== 0) process.exit(result.status ?? 1);
}
