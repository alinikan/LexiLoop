# Deployment and operations

The existing app is [lexiloop-ali.vercel.app](https://lexiloop-ali.vercel.app), deployed from [alinikan/LexiLoop](https://github.com/alinikan/LexiLoop). Gmail SMTP is configured in Supabase for private use.

The **README is the complete, current setup manual**. Follow it for Supabase, SMTP, OpenAI, GitHub, Vercel and iPhone installation. This document records operational behavior rather than duplicating environment instructions.

- Install with `npm ci`, use Node 24, and keep the lockfile.
- Initialize a new database with `npm run db:migrate` and `npm run db:seed`. Existing installations apply only new migrations.
- Migration execution holds a PostgreSQL advisory lock; each SQL file and ledger entry commit in one transaction. Failures roll back that migration.
- Use the modern server-only `SUPABASE_SECRET_KEY`, not the previous build's obsolete variable name. Do not add `DATABASE_URL` to Vercel unless a deliberate migration job needs it.
- Deploy the Next.js runtime, not a static export. Configure all real services and canonical HTTPS callback URLs, then redeploy after changing environment variables.
- Local HTTP is valid for development. Use `npm run check:production -- --app-url https://lexiloop-ali.vercel.app` to check deployment-style configuration without changing `.env.local`. This overrides only the origin, not other settings or Vercel values.
- `npm run check:production` validates production variable presence/origins/modes without printing values. It is not a live credential or billing test.
- Public previews should use an isolated Supabase project. Never use untrusted preview branches with production secrets or broad auth redirects.
- Operator signup alerts require the Resend server variables and a signed Database Webhook. Install it from **Supabase → Integrations → Database Webhooks → Overview** before creating the hook on `public.signup_events`. The README records the exact headers, Vercel fields and no-domain Resend test-sender restriction.

## Failure and recovery

A failed progress write leaves the current exercise available for retry; idempotency prevents duplicate awards. A revision conflict asks the learner to reload. An AI failure preserves the typed form and never falls back to mocks. Cold offline navigation gives reconnect guidance; private responses are not cached.

Supabase authentication links depend on Site URL, allowed redirects and templates. For support, inspect Auth and SMTP-provider logs without publishing tokens, passwords or private sentences. Keys accidentally exposed must be rotated with their provider, then updated in the relevant environment and redeployed.

Back up the database according to your plan and data importance, and rehearse restoration on an isolated project. The user's JSON export is an individual wordbook export, not a full operator backup or automatic import format. Account deletion is operator-managed through Supabase Auth and cascades private records. Shared canonical vocabulary remains.

In-app reminders and immediate browser notification tests require no cron/push infrastructure. This release does not send scheduled background push notifications.

The current release requires all migrations through `006_accent_insensitive_search.sql`. Run `npm run db:migrate` from the existing checkout, then `npm run db:seed` to load the complete searchable catalog. The runner applies only missing migrations and the repeatable seed preserves existing canonical cards and learner progress. Do not rerun old SQL manually, edit an applied migration, or recreate the database. The Supabase Database Webhooks integration is separate platform configuration and is not installed by migration 005.
