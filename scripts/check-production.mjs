try {
  process.loadEnvFile('.env.local');
} catch {
  /* Hosting supplies the environment. */
}
const problems = [];
for (const name of [
  'NEXT_PUBLIC_APP_URL',
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
  'SUPABASE_SECRET_KEY',
  'OPENAI_API_KEY',
])
  if (!process.env[name]?.trim()) problems.push(`${name} is missing.`);
if (
  process.env.NEXT_PUBLIC_DEMO_MODE === 'true' ||
  process.env.MOCK_AI === 'true' ||
  process.env.AI_PROVIDER !== 'openai'
)
  problems.push('Use NEXT_PUBLIC_DEMO_MODE=false, MOCK_AI=false, AI_PROVIDER=openai.');
for (const name of ['NEXT_PUBLIC_APP_URL', 'NEXT_PUBLIC_SUPABASE_URL']) {
  try {
    const url = new URL(process.env[name]);
    if (url.protocol !== 'https:') problems.push(`${name} must use HTTPS for public deployment.`);
  } catch {
    problems.push(`${name} must be a valid URL.`);
  }
}
if (
  process.env.CAMBRIDGE_LICENSE_CONFIRMED === 'true' &&
  (!process.env.CAMBRIDGE_API_KEY || !process.env.CAMBRIDGE_DICTIONARY_CODE)
)
  problems.push('Licensed Cambridge requires its API key and dictionary code.');
if (problems.length) {
  console.error(problems.join('\n'));
  process.exitCode = 1;
} else
  console.log(
    'Production environment names and modes are valid. This does not verify service credentials, billing, SMTP delivery, or Cambridge license rights.',
  );
