import { spawn } from 'node:child_process';
const child = spawn(
  process.execPath,
  ['node_modules/next/dist/bin/next', 'dev', ...process.argv.slice(2)],
  {
    stdio: 'inherit',
    env: { ...process.env, NEXT_PUBLIC_DEMO_MODE: 'true', MOCK_AI: 'true', AI_PROVIDER: 'mock' },
  },
);
child.on('exit', (code) => {
  process.exitCode = code ?? 1;
});
