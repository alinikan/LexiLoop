import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { expect, it } from 'vitest';
const script = resolve('scripts/check-production.mjs');
const valid = {
  NODE_ENV: 'test' as const,
  NEXT_PUBLIC_APP_URL: 'https://lexiloop-ali.vercel.app',
  NEXT_PUBLIC_SUPABASE_URL: 'https://fixture.supabase.co',
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'public-fixture',
  SUPABASE_SECRET_KEY: 'private-fixture',
  OPENAI_API_KEY: 'private-fixture',
  AI_PROVIDER: 'openai',
  MOCK_AI: 'false',
  NEXT_PUBLIC_DEMO_MODE: 'false',
};
function run(overrides: Record<string, string> = {}, file = '', args: string[] = []) {
  const cwd = mkdtempSync(join(tmpdir(), 'lexiloop-env-'));
  try {
    writeFileSync(join(cwd, '.env.local'), file);
    return spawnSync(process.execPath, [script, ...args], {
      cwd,
      encoding: 'utf8',
      env: { ...valid, ...overrides },
    });
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
}
it('accepts the production origin without requiring DATABASE_URL', () => {
  const result = run();
  expect(result.status).toBe(0);
  expect(result.stdout).not.toContain('private-fixture');
});
it('explains valid local HTTP settings without weakening deployment HTTPS checks', () => {
  const result = run({ NEXT_PUBLIC_APP_URL: 'http://localhost:3000' });
  expect(result.status).toBe(1);
  expect(result.stderr).toContain('correct for local development');
});
it('supports a cross-platform URL override without rewriting the env file', () => {
  expect(
    run({ NEXT_PUBLIC_APP_URL: 'http://localhost:3000' }, '', [
      '--app-url',
      valid.NEXT_PUBLIC_APP_URL,
    ]).status,
  ).toBe(0);
});
it.each(['/login', '/?token=private', '/#secret'])('rejects a non-origin URL %s', (suffix) => {
  expect(run({ NEXT_PUBLIC_APP_URL: valid.NEXT_PUBLIC_APP_URL + suffix }).status).toBe(1);
});
it('detects duplicate env entries without printing their contents', () => {
  const result = run({}, 'DATABASE_URL=private-value\nDATABASE_URL=\n');
  expect(result.status).toBe(1);
  expect(result.stderr).toContain('DATABASE_URL appears more than once');
  expect(result.stderr).not.toContain('private-value');
});
it('preserves shell environment precedence over local files', () => {
  expect(run({}, 'NEXT_PUBLIC_APP_URL=http://localhost:3000\n').status).toBe(0);
});
it('rejects missing secrets and enabled mock modes', () => {
  expect(run({ SUPABASE_SECRET_KEY: '', MOCK_AI: 'true' }).status).toBe(1);
});
