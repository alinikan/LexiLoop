import { readFileSync } from 'node:fs';

const args = process.argv.slice(2);
if (args.includes('--help')) {
  console.log(
    'Usage: npm run check:production -- [--app-url https://your-app.vercel.app]\nChecks deployment configuration only; never calls providers or rewrites .env.local.\nBy default reads .env.local, with existing shell variables taking precedence.',
  );
  process.exit(0);
}
const problems = [];
try {
  const text = readFileSync('.env.local', 'utf8');
  const names = [...text.matchAll(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=/gm)].map(
    (m) => m[1],
  );
  for (const name of new Set(names))
    if (names.filter((n) => n === name).length > 1)
      problems.push(
        `${name} appears more than once in .env.local. Keep one entry; values are not displayed.`,
      );
  process.loadEnvFile('.env.local');
} catch (error) {
  if (error.code !== 'ENOENT')
    problems.push('Could not read .env.local. Check file permissions and syntax.');
}
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--app-url' && args[i + 1]) process.env.NEXT_PUBLIC_APP_URL = args[++i];
  else problems.push('Unknown or incomplete option. Use --help.');
}
for (const name of [
  'NEXT_PUBLIC_APP_URL',
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
  'SUPABASE_SECRET_KEY',
  'OPENAI_API_KEY',
  'ADMIN_EMAILS',
  'RESEND_API_KEY',
  'SIGNUP_NOTIFICATION_TO',
  'SIGNUP_NOTIFICATION_FROM',
  'SIGNUP_WEBHOOK_SECRET',
])
  if (!process.env[name]?.trim()) problems.push(`${name} is missing.`);
for (const email of (process.env.ADMIN_EMAILS ?? '').split(',').filter(Boolean))
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))
    problems.push('ADMIN_EMAILS must contain comma-separated email addresses.');
if (
  process.env.SIGNUP_NOTIFICATION_TO &&
  !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(process.env.SIGNUP_NOTIFICATION_TO)
)
  problems.push('SIGNUP_NOTIFICATION_TO must be an email address.');
if ((process.env.SIGNUP_WEBHOOK_SECRET?.length ?? 0) < 32)
  problems.push('SIGNUP_WEBHOOK_SECRET must contain at least 32 characters.');
if (
  process.env.NEXT_PUBLIC_DEMO_MODE === 'true' ||
  process.env.MOCK_AI === 'true' ||
  process.env.AI_PROVIDER !== 'openai'
)
  problems.push('Use NEXT_PUBLIC_DEMO_MODE=false, MOCK_AI=false, AI_PROVIDER=openai.');
for (const name of ['NEXT_PUBLIC_APP_URL', 'NEXT_PUBLIC_SUPABASE_URL']) {
  try {
    const url = new URL(process.env[name]);
    if (url.protocol !== 'https:') {
      problems.push(`${name} must use HTTPS for public deployment.`);
      if (
        name === 'NEXT_PUBLIC_APP_URL' &&
        ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)
      )
        problems.push(
          'HTTP localhost is correct for local development. This command checks deployment settings. Keep .env.local unchanged and use: npm run check:production -- --app-url https://lexiloop-ali.vercel.app',
        );
    }
    if (url.pathname !== '/' || url.search || url.hash || url.username || url.password)
      problems.push(
        `${name} must be a base origin without a path, query, fragment, or credentials (do not append /login).`,
      );
    if (['localhost', '127.0.0.1', '[::1]'].includes(url.hostname) && url.protocol === 'https:')
      problems.push(`${name} must name your public deployment, not localhost.`);
  } catch {
    problems.push(`${name} must be a valid URL.`);
  }
}
if (problems.length) {
  console.error(problems.join('\n'));
  process.exitCode = 1;
} else
  console.log(
    'Production configuration checks passed. This does not verify service credentials, model access, billing, or SMTP delivery.',
  );
