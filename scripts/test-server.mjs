// Test-only launcher: overrides local credentials; never imported by application code.
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
const account = process.argv[2] === 'account';
const port = account ? 4173 : 4172;
const origin = `http://127.0.0.1:${port}`;
const users = new Map();
const userId = '10000000-0000-4000-8000-000000000001';
const user = {
  id: userId,
  aud: 'authenticated',
  role: 'authenticated',
  email: 'learner@example.com',
  email_confirmed_at: new Date().toISOString(),
  app_metadata: {},
  user_metadata: {},
  created_at: new Date().toISOString(),
};
const session = () => ({
  access_token: `${Buffer.from('{}').toString('base64url')}.${Buffer.from(JSON.stringify({ sub: userId, exp: Math.floor(Date.now() / 1000) + 3600 })).toString('base64url')}.fixture`,
  refresh_token: 'fixture-refresh',
  token_type: 'bearer',
  expires_in: 3600,
  user,
});
let password = 'long test passphrase';
const authServer = createServer(async (req, res) => {
  let raw = '';
  for await (const part of req) raw += part;
  const body = raw ? JSON.parse(raw) : {};
  const path = new URL(req.url, 'http://127.0.0.1').pathname;
  res.setHeader('Content-Type', 'application/json');
  const send = (data, status = 200) => {
    res.statusCode = status;
    res.end(JSON.stringify(data));
  };
  if (path === '/auth/v1/signup') {
    if (users.has(body.email))
      return send({ code: 'user_already_exists', msg: 'Fixture duplicate' }, 422);
    users.set(body.email, body.password);
    return send({ ...user, email: body.email, identities: [] });
  }
  if (path === '/auth/v1/token') {
    if (body.grant_type === 'refresh_token' || body.refresh_token) return send(session());
    if (body.email !== user.email || body.password !== password)
      return send({ code: 'invalid_credentials', msg: 'Fixture invalid credentials' }, 400);
    return send(session());
  }
  if (path === '/auth/v1/verify') {
    if (body.token_hash === 'expired')
      return send({ code: 'otp_expired', msg: 'Fixture expired' }, 403);
    return send(session());
  }
  if (path === '/auth/v1/user') {
    if (!req.headers.authorization?.includes('.fixture'))
      return send({ msg: 'Fixture unauthenticated' }, 401);
    if (req.method === 'PUT') password = body.password;
    return send(user);
  }
  if (path === '/auth/v1/logout' || path === '/auth/v1/recover') return send({});
  return send({ msg: 'Unimplemented fixture endpoint' }, 404);
});
if (account) await new Promise((resolve) => authServer.listen(4174, '127.0.0.1', resolve));
const child = spawn(
  process.execPath,
  ['node_modules/next/dist/bin/next', 'dev', '--hostname', '127.0.0.1', '--port', String(port)],
  {
    stdio: 'inherit',
    env: {
      ...process.env,
      NEXT_PUBLIC_APP_URL: origin,
      NEXT_PUBLIC_DEMO_MODE: account ? 'false' : 'true',
      NEXT_PUBLIC_SUPABASE_URL: account ? 'http://127.0.0.1:4174' : '',
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: account ? 'fixture-public' : '',
      SUPABASE_SECRET_KEY: account ? 'fixture-server' : '',
      OPENAI_API_KEY: '',
      OPENAI_MODEL: 'gpt-5.6-terra',
      MOCK_AI: 'true',
      AI_PROVIDER: 'mock',
      DATABASE_URL: '',
    },
  },
);
for (const signal of ['SIGINT', 'SIGTERM'])
  process.on(signal, () => {
    child.kill(signal);
    authServer.close();
  });
child.on('exit', (code) => {
  authServer.close();
  process.exitCode = code ?? 1;
});
