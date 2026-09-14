# LexiLoop

**Small steps. Lasting words.**

LexiLoop helps you expand your vocabulary and use new words naturally in everyday conversations. It focuses on word knowledge, recall and personal expression, not general English instruction or grammar grading. Save a word from your own life, choose suggestions, practice it in context, and return when it is due for another review.

[Open LexiLoop](https://lexiloop-ali.vercel.app) · [Source repository](https://github.com/alinikan/LexiLoop)

The current deployment is a small private app hosted on Vercel, with real Supabase accounts, Gmail SMTP delivery through Supabase, and OpenAI lesson generation using `gpt-5.6-terra`. Cambridge API integration is optional and disabled by default. A custom domain, Resend account, and Vercel Marketplace database integration are not required.

## Contents

- [What the app does](#what-the-app-does)
- [How the pieces fit together](#how-the-pieces-fit-together)
- [Install and run locally](#install-and-run-locally)
- [Environment variables](#environment-variables)
- [Supabase database and authentication](#supabase-database-and-authentication)
- [Gmail SMTP and email templates](#gmail-smtp-and-email-templates)
- [OpenAI setup and generation](#openai-setup-and-generation)
- [Optional Cambridge reference](#optional-cambridge-reference)
- [New vocabulary tools and upgrade steps](#vocabulary-experience-recommendations-recall-and-everyday-use)
- [Vercel deployment](#vercel-deployment)
- [Testing](#testing)
- [Post-deployment checklist](#post-deployment-checklist)
- [Troubleshooting](#troubleshooting)
- [Security, cost and operations](#security-cost-and-operations)

## What the app does

An account starts with an empty personal wordbook and no invented progress. Signup requires email confirmation. Sign-in, sign-out, forgotten-password requests and password changes are supported.

Choose a daily goal (five words by default, configurable from one to twenty). Preview an automatically recommended set, edit its words and size, and accept only what you want. Nothing is added just by previewing. You can also fill the set manually. Accepting a smaller/larger set changes today's goal only. Starting locks that day's selection. Questions and answers autosave after a brief pause; a saved session resumes across reloads and days. Completed words save individually.

New learning sessions first introduce every selected new word, then interleave exercises across those words and every active previously learned word. Exercises cover meaning, context, distinctions, typed recall, personal sentences, application and confidence; earlier words receive recall and context plus extra tasks for weak skills. Existing saved sessions retain their original flow until finished or discarded. Personal sentences are checked for the word's presence and self-assessed; the app does not send them to AI for grading. Review sessions use recall, context and confidence. Wrong answers bring a word back in ten minutes; successful reviews gradually increase the interval. Quick review covers up to five due words and full review up to thirty. You can also practice a learned word early.

The wordbook supports notes, original context, tags, priority, favorites, search, filters, removal, archiving and schedule reset. Remove from My Words deletes that saved word’s notes and schedule, closes affected unfinished sessions, and adjusts an unfinished active daily set. Past activity and shared teaching content remain. Archive is the reversible alternative. Progress includes learned/mastered words, XP, practice success, streaks, seven-day activity and milestones. A completed new-word lesson earns 20 XP and a review earns 10. “Mastered” means an interval of at least thirty days and confidence of at least three out of four.

Preferences include display name, level, interests, timezone, reminders, dark appearance and reduced motion. Suggestions filter unsaved words to the selected level, then rank by usefulness and interests. Search finds both Suggested and My Saved Words across all levels, including learned words. Browsing loads 24 cards at a time. The library contains 400 original lessons: 38 A2, 55 B1, 109 B2 and 198 C1. These are editorial difficulty estimates, not certified CEFR ratings. This is a curated learning library, not a complete dictionary or an unlimited AI recommendation feed. Saved custom lessons expand a learner's available content.

Install the website on your Home Screen through your browser. Public assets and a reconnect page work offline; already loaded words remain readable while open. Account changes require a connection. Reminders appear inside the app; the notification control sends an immediate permission test, not scheduled background push. Device pronunciation uses the browser's voice, separate from optional Cambridge audio.

## How the pieces fit together

```text
Browser → Next.js pages and API routes on Vercel
                    ├─ Supabase Auth: identity and email links
                    ├─ Supabase PostgreSQL: words, profiles and practice data
                    ├─ OpenAI: new lessons when no stored lesson exists
                    └─ Cambridge: optional, separately licensed reference
Supabase Auth → Gmail SMTP → verification and recovery emails
```

The project uses Next.js 16 App Router, React 19, TypeScript, Supabase, PostgreSQL, the OpenAI SDK, Zod validation, Vitest and Playwright. Node 24 is the recommended runtime. Exact dependency versions come from `package-lock.json`.

| Location                 | Responsibility                                                                        |
| ------------------------ | ------------------------------------------------------------------------------------- |
| `app/`                   | Pages, authenticated API routes and email callback                                    |
| `components/`            | Learning interface, account forms and client state                                    |
| `lib/domain.ts`          | Daily-set rules and commands that change learning state                               |
| `lib/spaced-repetition/` | Review scheduling                                                                     |
| `lib/db/`                | Verified users, private reads and authorized database writes                          |
| `lib/ai/`                | Lesson schema, original-content prompt and provider                                   |
| `lib/dictionary/`        | Separate optional Cambridge integration                                               |
| `data/catalog.ts`        | Original starter lessons plus `data/expanded.ts` and `data/more-words.ts` (400 total) |
| `supabase/migrations/`   | Versioned SQL schema, policies and functions                                          |
| `scripts/`               | Database setup, configuration checks and isolated test launchers                      |
| `tests/`                 | Unit, route, embedded database and browser tests                                      |
| `public/`                | PWA icons, service worker and offline page                                            |

Normal reads load the whole personal collection in pages of database results, but only the latest 31 daily sets and 100 review events, plus the original daily set of any older paused lesson. PostgreSQL computes lifetime totals without transferring the entire history. Settings offers a JSON export containing all personal history; this is a download, not a database backup or an import feature.

Changes are validated on the server and committed together in a database transaction. A profile revision detects another tab changing the same account. Repeated completion requests are recognized by their event ID so a retry does not award progress twice. See [architecture](docs/architecture.md) and [review scheduling](docs/spaced-repetition.md) for implementation details.

## Install and run locally

### 1. Install Git and Node.js

Git downloads and tracks the repository. Install it from [Git's official download page](https://git-scm.com/downloads), then verify `git --version`. On macOS, running Git may prompt you to install Apple's command-line developer tools.

Node.js is the JavaScript runtime that runs the development server, builds, tests and setup scripts. npm, included with Node, installs dependencies and runs the commands in `package.json`.

**macOS:** use [nvm's official installation instructions](https://github.com/nvm-sh/nvm#installing-and-updating). Run the installation command from that page in Terminal, then open a new terminal so your shell loads nvm. Confirm it is available with `command -v nvm`. Avoid installer commands from unrelated websites.

```bash
nvm install 24
node --version
npm --version
```

**Windows:** download the Node.js **24** Windows installer from [nodejs.org](https://nodejs.org/en/download), choose your machine's architecture, and keep npm and PATH integration enabled. Open a new PowerShell window after installation:

```powershell
node --version
npm --version
git --version
```

Expect Node `v24.x.x`; patch versions can differ. nvm-sh is intended for POSIX shells, not native PowerShell. The official Node installer is sufficient on Windows; a separate version manager is optional.

### 2. Clone the existing repository

Choose any folder you like. For example, from your Documents folder:

```bash
git clone https://github.com/alinikan/LexiLoop.git
cd LexiLoop
```

All following commands run inside this folder, beside `package.json`. Do not initialize another repository. If you already have this checkout, use it instead of cloning over it.

On macOS with nvm:

```bash
nvm use
```

This reads `.nvmrc` and selects Node 24 for the current terminal. Run it after opening a new terminal or entering the project when another Node version is active. You do not need to run it before every npm command. Optionally, `nvm alias default 24` makes Node 24 the default in new shells.

### 3. Install the locked dependencies

```bash
npm ci
```

`npm ci` installs the dependency versions recorded in `package-lock.json`, replacing an existing `node_modules` directory. Use it for reproducible clean installs and CI. `npm install` is normally used when deliberately adding or updating a dependency and its lockfile. Never transfer `node_modules` between project copies or computers; it is generated output.

### 4. Create local configuration

If `.env.local` already exists, edit it without overwriting its credentials. Otherwise copy the template:

macOS:

```bash
cp -n .env.example .env.local
```

Windows PowerShell:

```powershell
if (!(Test-Path .env.local)) { Copy-Item .env.example .env.local }
```

Open `.env.local` in your editor. Keep exactly one entry per variable. Use the service instructions below to fill in your own values. This file is ignored by Git and must stay private.

### 5. Start the app

After configuring Supabase, migrations, email and OpenAI:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Stop the server with Ctrl+C. Restart after editing `.env.local`.

For a quick interface preview before configuring services:

```bash
npm run dev:demo
```

This explicitly enables a local **demo mode**: no real accounts, no paid AI calls, and the 400 original library lessons. Practice is stored in this browser's local storage and does not transfer to a real account. A **mock provider** means a local stand-in that returns starter content instead of contacting OpenAI. Production builds disable both demo mode and mock generation so a deployed account app cannot accidentally save users' progress only on their device.

## Environment variables

Public variables beginning with `NEXT_PUBLIC_` may appear in browser JavaScript. All other variables below are server/tool configuration. “Server config” describes a non-secret setting, not permission to expose secret keys alongside it.

| Variable                               | Local `.env.local`           | Vercel Production                 | Visibility and purpose                               |
| -------------------------------------- | ---------------------------- | --------------------------------- | ---------------------------------------------------- |
| `NEXT_PUBLIC_DEMO_MODE`                | `false`                      | `false`                           | Public; local demo switch, ignored in production     |
| `MOCK_AI`                              | `false`                      | `false`                           | Server config; mock selection guard                  |
| `AI_PROVIDER`                          | `openai`                     | `openai`                          | Server config; provider choice                       |
| `NEXT_PUBLIC_APP_URL`                  | `http://localhost:3000`      | `https://lexiloop-ali.vercel.app` | Public; base app origin for auth and request checks  |
| `NEXT_PUBLIC_SUPABASE_URL`             | Your project URL             | Same project URL                  | Public; Supabase HTTPS endpoint                      |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Your publishable key         | Same key                          | Browser-safe project key; permissions still enforced |
| `SUPABASE_SECRET_KEY`                  | Your server secret           | Same secret                       | **Secret**; privileged server database operations    |
| `DATABASE_URL`                         | Required for migrations/seed | **Not needed**                    | **Secret**; PostgreSQL setup connection              |
| `OPENAI_API_KEY`                       | Your project API key         | Your project API key              | **Secret**; server-side AI access                    |
| `OPENAI_MODEL`                         | `gpt-5.6-terra`              | `gpt-5.6-terra`                   | Server config; same fallback if unset                |
| `CAMBRIDGE_API_KEY`                    | Optional; empty              | Optional; omit                    | **Secret**; licensed API access                      |
| `CAMBRIDGE_DICTIONARY_CODE`            | Optional; empty              | Optional; omit                    | Server config; licensed dataset                      |
| `CAMBRIDGE_LICENSE_CONFIRMED`          | `false`                      | `false`                           | Server config; explicit license gate                 |
| `CAMBRIDGE_AUDIO_LICENSE_CONFIRMED`    | `false`                      | `false`                           | Server config; separate audio-rights gate            |

The current deployment uses Supabase project `https://zpmutfqbklrvwwzizkuv.supabase.co`. That URL is public configuration, not a credential. Maintainers use that project's keys privately; a separate installation should create its own project and use its own values. The template intentionally contains no actual keys or database passwords.

The application consistently uses `SUPABASE_SECRET_KEY`. It is never browser-prefixed. Gmail's App Password belongs in **Supabase SMTP settings**, not `.env.local` or Vercel.

## Supabase database and authentication

### Select the project and retrieve keys

For the existing deployment, select its existing project in the [Supabase dashboard](https://supabase.com/dashboard). For a separate installation, create a project, choose a region and save its database password in a password manager. Your dashboard login is separate from learner accounts inside LexiLoop.

Use the project's Connect dialog or Settings → API Keys to obtain its URL, publishable key and server secret. Supabase's modern keys use `sb_publishable_…` and `sb_secret_…` prefixes. Copy them to their corresponding environment entries. Dashboard labels can change; see [Supabase API keys](https://supabase.com/docs/guides/getting-started/api-keys).

### Connect for migrations

Get the PostgreSQL connection string from the project's Connect dialog. A direct connection has this shape:

```text
postgresql://postgres:<DATABASE_PASSWORD>@db.<PROJECT_REF>.supabase.co:5432/postgres
```

The password is the **database password**, not a Supabase account password, API key, or learner password. Encode reserved characters in a password when placing it inside a URL. Put the completed connection string in `DATABASE_URL` locally.

Direct connections can require IPv6 connectivity. If your network cannot connect, select **Session pooler** and copy the exact host, username and connection settings Supabase supplies. Do not invent a pooler hostname or turn off certificate validation to bypass TLS errors. See [PostgreSQL connections](https://supabase.com/docs/guides/database/connecting-to-postgres).

### Apply migrations and seed starter lessons

```bash
npm run db:migrate
npm run db:seed
```

A **migration** is a versioned SQL file that creates or changes database structures. The runner holds a database lock so two migration processes do not apply the same file simultaneously. It records completed files in `public.lexiloop_migrations`, the **migration ledger**. Each file and its ledger entry commit together, or both roll back on failure. Re-running skips recorded files.

The current files are `001_initial.sql`, `002_production.sql`, `003_vocabulary_practice.sql`, and `004_remove_saved_words.sql`. **Existing installations must run `npm run db:migrate` before deploying this vocabulary update.** Migration 003 adds private practice data. Migration 004 extends the atomic save function to remove only the requesting account’s selected saved words. Applying either migration does not delete existing progress. Run `npm run db:seed` as well: the expanded library must exist in the shared database before users save its new words. Seeding inserts missing entries and preserves existing cards. Do not edit an already applied file to update a live schema; add a new migration. If SQL was previously applied manually without ledger entries, inspect the actual schema before running it again.

The seed inserts exactly **20 original starter lessons** in a fresh database, with **20 meaning rows and 40 example rows**. It is safe to repeat: existing canonical lessons are preserved. A used database can contain more than twenty words because generated lessons are stored there too.

Tables include profiles, shared words/meanings/examples, private saved words, daily sets and their items, review events, suggestion feedback, generation and dictionary quotas, aliases, generation leases and the migration ledger. New Auth users get a profile automatically through a database trigger. Older accounts without a profile receive one on their first successful state write.

Run these read-only checks in Supabase SQL Editor:

```sql
select name from public.lexiloop_migrations order by name;
select count(*) as stored_lessons from public.words;
select count(*) as meaning_rows from public.word_meanings;
select count(*) as example_rows from public.word_examples;
select schemaname, tablename, rowsecurity
from pg_tables where schemaname = 'public' order by tablename;

select schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
from pg_policies where schemaname = 'public'
order by tablename, policyname;
```

The ledger should list all three migrations. All LexiLoop tables, including the ledger, should have row security enabled.

### Understand Row Level Security

**Row Level Security (RLS)** applies database rules to individual rows. Being signed in does not give a learner access to every profile or wordbook. Policies allow authenticated users to read their own private records. Shared lesson definitions can be read by all authenticated learners, while notes, sentences, settings and review history remain private.

Browser clients cannot directly write app tables or invoke privileged write functions. The Next.js server verifies the Supabase user, validates the command, applies learning rules, then calls the required database function. Identity comes from the verified session, never a browser-submitted user ID.

The server secret can bypass RLS, which is why it must remain server-only and cannot replace authorization checks. SQL Editor normally runs with elevated privileges: seeing all rows there does not test learner isolation. See [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security).

### Configure email/password authentication and URLs

Enable the Email/password provider and **Confirm email** in Authentication. Configure a minimum password length of at least twelve characters; the app enforces this for signup and password changes. Existing shorter passwords remain accepted at sign-in. No Google login provider is required.

For the existing production project, set **Site URL** to:

```text
https://lexiloop-ali.vercel.app
```

Keep these allowed redirects for production and local development:

```text
https://lexiloop-ali.vercel.app/auth/confirm
https://lexiloop-ali.vercel.app/auth/confirm?next=/reset-password
https://lexiloop-ali.vercel.app/reset-password
http://localhost:3000/auth/confirm
http://localhost:3000/auth/confirm?next=/reset-password
http://localhost:3000/reset-password
```

A separate local-only Supabase project can use `http://localhost:3000` as its Site URL. Site URL is project-wide, while redirect URLs are an allowlist. Keep local `NEXT_PUBLIC_APP_URL` pointing to localhost even when sharing the production project.

`/login` is an app page, not the base origin or a Supabase callback. An unauthenticated visit to `/` redirects there, but neither Site URL nor `NEXT_PUBLIC_APP_URL` should end in `/login`. Use a consistent hostname and port; `localhost` and `127.0.0.1` are different origins. See [redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls).

## Gmail SMTP and email templates

### Gmail for this private deployment

SMTP is how Supabase delivers email. For this one-to-two-person deployment, use a dedicated Gmail address:

1. Sign into its Google account and enable **2-Step Verification** under Security.
2. Create an **App Password** for LexiLoop using [Google's App Password instructions](https://support.google.com/accounts/answer/185833). Use that generated password, not your normal Google password. Some managed accounts or security configurations do not offer App Passwords; use an eligible account or a transactional provider in that case.
3. In Supabase Authentication's email/SMTP settings, enable custom SMTP and enter:

| SMTP setting | Value                   |
| ------------ | ----------------------- |
| Host         | `smtp.gmail.com`        |
| Port         | `465` (SSL/TLS)         |
| Username     | Dedicated Gmail address |
| Password     | Google App Password     |
| Sender name  | `LexiLoop`              |
| Sender email | The same Gmail address  |

4. Save and check signup and recovery delivery. Check spam and Supabase Auth logs if an email fails.

These SMTP credentials stay in Supabase. The app sends authentication requests to Supabase; it does not connect to Gmail itself. No Gmail password or SMTP configuration is needed in Vercel.

Supabase warns that personal mail providers have delivery and rate limitations. That is a reasonable tradeoff for this private use case, not a promise of reliable public bulk delivery. For a larger public deployment, switch to a transactional provider such as Resend and follow its domain-verification requirements. Buying a domain is not required for the current Gmail/Vercel setup. Supabase's built-in test sender has recipient restrictions and is not a replacement for configured SMTP. See [custom SMTP](https://supabase.com/docs/guides/auth/auth-smtp).

### Templates control the links

SMTP delivers the message; the template sets its content and destination. In Supabase Email Templates, use these subjects and links.

**Confirm signup — subject:** `Confirm your LexiLoop account`

```html
<h2>Welcome to LexiLoop</h2>
<p>Confirm your email address to finish creating your account.</p>
<p><a href="{{ .RedirectTo }}?token_hash={{ .TokenHash }}&type=email">Confirm email</a></p>
<p>If you did not create this account, you can ignore this email.</p>
```

**Password reset — subject:** `Reset your LexiLoop password`

```html
<h2>Reset your LexiLoop password</h2>
<p>We received a request to reset your password.</p>
<p><a href="{{ .RedirectTo }}&token_hash={{ .TokenHash }}&type=recovery">Reset password</a></p>
<p>If you did not request a password reset, you can ignore this email.</p>
```

Keep Supabase's template placeholders intact. These templates match the app's actual destinations: signup supplies `/auth/confirm`, and recovery supplies `/auth/confirm?next=/reset-password`. They use **RedirectTo** so a request started locally can return locally even when the project's Site URL is production. The `?` in the signup link and `&` in the reset link are deliberate.

A template using `{{ .SiteURL }}/auth/confirm?...` also works, but always returns to that project-wide Site URL. For the current shared project, that means production even if you requested the message locally. Use the templates above for environment-specific return URLs. They are intended for this app's signup/recovery requests, not arbitrary dashboard invitation flows. See [template variables](https://supabase.com/docs/guides/auth/auth-email-templates).

The `/auth/confirm` route verifies the token hash server-side, creates authentication cookies, and sends recovery links to `/reset-password`. Other confirmation links return to `/`. It also accepts the Supabase authorization-code flow; that flow can require the initiating browser's code-verifier cookie. Invalid or expired links go to `/login?confirmation=failed` without copying tokens into the error message. Only the internal reset destination is accepted from `next`.

## OpenAI setup and generation

Create or select a project on the [OpenAI API platform](https://platform.openai.com), generate a private API key, and configure API billing separately from ChatGPT. A ChatGPT Plus subscription does not fund this application's API requests. Choose the key's lifetime according to your operational needs and keep it revocable.

Set these server variables locally and in Vercel:

```dotenv
OPENAI_API_KEY=YOUR_PRIVATE_PROJECT_KEY
OPENAI_MODEL=gpt-5.6-terra
AI_PROVIDER=openai
MOCK_AI=false
```

The chosen model must be enabled for your API project. The [GPT-5.6 Terra model page](https://developers.openai.com/api/docs/models/gpt-5.6-terra) documents Responses API and structured-output support. A valid-looking model setting does not prove your project has access or available credits.

The provider sends only the requested word plus the lesson instructions. It uses the Responses API, `store: false`, a 35-second timeout per request and no SDK automatic retries. Zod validates the returned structure, and additional checks verify answer indices and all four exercise categories. Invalid lesson output gets one second attempt. Credentials, billing, permissions, rate limits, unavailable models and network failures do not get retried as malformed content.

Lessons include meanings and examples, a scenario, usage/register guidance, common mistakes, synonym distinctions, antonyms, word family, collocations, patterns, a memory association and exercises. Schema validation checks completeness, not factual truth; review generated content before saving it. See [generation details](docs/ai-content.md) and [OpenAI structured outputs](https://developers.openai.com/api/docs/guides/structured-outputs).

### Stored lessons reduce repeated cost

A **cached lesson** is a lesson already stored in the shared `words` table. Starter words and stored lessons can be reused without another OpenAI call. An **alias** links an input form to its canonical word when the model normalizes it. Your notes and practice sentences remain separate, private data.

If two requests ask for the same uncached input nearly simultaneously, the database gives one a temporary **generation lease** lasting ninety seconds. The other receives a “being prepared” response and can retry later to reuse the stored result. The lease owner rechecks the cache before spending quota. Different input spellings can still generate separately before their relationship is known; this is not a guarantee against every possible duplicate cost.

The database allows **20 new generation attempts per account per UTC day**. Failed attempts count; a validation retry belongs to the same allowance but can still incur a second API charge. Cache hits do not consume this allowance. This application quota is separate from OpenAI's billing and request-rate limits.

### Provider failures and budget

Learners receive a stable message when AI is unavailable; saved lessons remain usable. Server logs include `lexiloop.ai.unavailable` with a fixed category such as `billing_quota`, `rate_limit`, `authentication`, `permission`, `model_unavailable`, `timeout` or `network`. They do not include keys, upstream error bodies, account balances or vocabulary input.

An SDK `insufficient_quota` code/type is treated as billing quota; other HTTP 429 errors are treated as rate limits. Unknown provider errors remain generic rather than guessed from message text. See [OpenAI error guidance](https://developers.openai.com/api/docs/guides/error-codes).

Costs depend on model, input/output tokens and new lessons requested. Prepaid funding amounts and automatic reload are owner choices, not app requirements. Review current [API pricing](https://developers.openai.com/api/docs/pricing) and your project's usage/billing settings. Do not assume an application quota is a monetary spending cap.

## Optional Cambridge reference

Keep all Cambridge fields empty/false unless you have approved API access and the required license. The current app works without it and shows an external Cambridge link on word cards. It does not scrape dictionary pages.

To enable it later, obtain an application-specific API key and dictionary code through [Cambridge's developer service](https://dictionary-api.cambridge.org/), review the agreement, and then configure the key, code and `CAMBRIDGE_LICENSE_CONFIRMED=true`. Enable audio separately only if the agreement permits it.

Lookups happen only after pressing the button. The first supplied entry is displayed separately in a script-disabled frame with attribution and a source link. Cambridge content is not saved in the wordbook database, browser local storage, exports, service-worker cache or AI prompts. Missing entries or audio leave the original lesson available. Registration alone does not establish production licensing rights.

## Vercel deployment

The existing chain is **GitHub → Vercel → the existing Supabase project**. Use the current Vercel project for `lexiloop-ali.vercel.app`; do not create another database through Marketplace/Storage merely because Vercel offers one.

For a separate deployment, import your authorized GitHub repository into Vercel, choose Next.js, use Node 24 and keep the repository root as the root directory. Use `npm ci` for installation and `npm run build` for the build. This app needs server routes; it is not a static export.

1. Add the Vercel Production variables from the environment table. The app origin is `https://lexiloop-ali.vercel.app` for the existing deployment.
2. Mark public `NEXT_PUBLIC_*` values as configuration when Vercel prompts. Exposing the website URL, Supabase project URL and publishable key is intentional. Keep `SUPABASE_SECRET_KEY` and `OPENAI_API_KEY` private.
3. Leave `DATABASE_URL` out of the Vercel runtime. Apply migrations from your local setup before code depending on them is deployed.
4. Deploy the intended Git branch. Changes to Vercel environment values require a **new deployment**. Public variables are incorporated into browser code during the build.
5. Confirm Supabase's production Site URL, redirect allowlist, SMTP and templates, then follow the runtime checklist below.

A supplied `vercel.app` domain is sufficient. A custom domain is optional; changing domains later requires updating the app origin, Site URL, redirects and a new build. Preview deployments should use separate service configuration; do not give untrusted branches production secrets. See [Vercel environment variables](https://vercel.com/docs/environment-variables) and [Git deployments](https://vercel.com/docs/git).

### Check deployment configuration locally

```bash
npm run check:production
```

This reads `.env.local` with existing shell values taking precedence and validates deployment settings without printing credentials or calling providers. It intentionally rejects HTTP origins for public deployment. **HTTP localhost is correct for development**, so that rejection does not mean your local setup or deployed site is broken.

To check the production origin while keeping local configuration unchanged, this works on macOS and PowerShell:

```bash
npm run check:production -- --app-url https://lexiloop-ali.vercel.app
```

The remaining values still come from your local file/shell; this does **not** inspect Vercel's saved environment. A passed check proves settings are present and structurally appropriate, not that credentials, SMTP, billing or runtime integrations work. Duplicate variable names and URLs ending in `/login` are rejected with guidance.

## Testing

Run the clean verification sequence from the repository root:

```bash
npm ci
npm run lint
npm run typecheck
npm test
npx playwright install chromium
npm run test:e2e
npm run build
```

On macOS with nvm, run `nvm use` first. On Linux CI, Playwright uses `npx playwright install --with-deps chromium` to install required system libraries too.

`npm run verify` combines lint, TypeScript, unit/database tests and the production build. Browser tests remain an explicit command because they need Chromium installed.

| Check       | What it exercises                                                                                                     |
| ----------- | --------------------------------------------------------------------------------------------------------------------- |
| `lint`      | Source-code rules and common mistakes                                                                                 |
| `typecheck` | TypeScript consistency without changing application output                                                            |
| `test`      | Learning rules, auth routes, provider errors, configuration, cache/quota behavior and real SQL in embedded PostgreSQL |
| `test:e2e`  | Learning/demo journeys followed by account forms and real auth routes against a local Auth fixture                    |
| `build`     | Optimized Next.js production compilation                                                                              |

Automated tests do not send real email or consume OpenAI credits. Database tests use PGlite, an embedded PostgreSQL engine, with simulated Supabase Auth roles. They execute the migration runner, SQL policies and database functions. Account browser tests run the actual Next.js routes and SSR cookies against a local Auth stand-in; learning journeys use local demo state. These are useful integration checks, but they do not establish hosted email delivery or production persistence.

Browser tests start their own servers sequentially on `127.0.0.1:4172` and `:4173`, with a local Auth fixture on `:4174`. They override service settings with test values and refuse to reuse a running server. Stop other processes using these test ports. The account server disables real AI and Cambridge. Optional Today screenshots use `E2E_SCREENSHOTS=true`; normal account screenshots and failure traces go to ignored `test-results/` paths.

For an explicitly requested live sign-in smoke test, set `E2E_BASE_URL` to the HTTPS deployment origin and `E2E_EMAIL` / `E2E_PASSWORD` to a dedicated confirmed test account in your private shell environment. Then run `npx playwright test --config playwright.live.config.ts`. This separate configuration never starts a local server and disables traces, screenshots and video. It is excluded from normal automated verification; it logs in and out but does not send email or request AI content. Never put real test passwords in command examples or committed files.

GitHub Actions runs the same clean installation, lint, TypeScript, unit/database tests, build and browser checks on Node 24. A job waiting for a hosted runner has not tested any code yet. Check the [Actions page](https://github.com/alinikan/LexiLoop/actions), runner availability and account restrictions before changing source to address a queue delay.

See [verification notes](docs/verification.md) for the latest recorded results and their boundaries.

## Post-deployment checklist

A green build means code compiled and deployed. It does not prove that live Supabase credentials, SMTP, OpenAI billing or password recovery work. Use accounts and inboxes you control for these checks:

- [ ] Open the base production URL while signed out; it should redirect to `/login`.
- [ ] Create an account, receive its email, follow the confirmation link, then sign in.
- [ ] Check invalid email/short-password guidance and a wrong-password attempt.
- [ ] Save profile preferences and a starter word. Reload, sign out and sign back in; confirm they remain.
- [ ] Select a daily set, replace a word before starting, and verify that starting locks it.
- [ ] Finish a lesson; reload and check review scheduling and progress.
- [ ] Request a word not already in the starter set or database. This can incur API cost. Inspect the generated lesson, save it and reload.
- [ ] Request that word again and verify no additional generation in OpenAI usage/logs; the saved database lesson should be reused.
- [ ] Request a reset email, follow it, change the password and sign in with the new password.
- [ ] Confirm an expired/reused email link gives useful guidance.
- [ ] Use a second account in another browser profile. Confirm private notes, settings and history are not shared. Shared definitions are expected.
- [ ] Check mobile and tablet layouts, keyboard navigation, dark mode and reduced motion.
- [ ] Try going offline: loaded words may remain readable, but changes must not falsely report saved.
- [ ] Check Vercel runtime logs and Supabase Auth/database logs for unexpected failures without sharing secret values.
- [ ] Review API billing and limits. Test failure handling with fixtures; do not deliberately spend all real credits to reproduce exhaustion.

On iPhone, open the HTTPS app in Safari, choose Share (or More → Share), then Add to Home Screen. Enable Open as Web App if offered and tap Add. Check sign-in and navigation from the installed icon. Chromium phone emulation does not verify physical Safari or iOS installation.

## Troubleshooting

### Strange TypeScript packages such as `node 3` or `react 3`

These can indicate malformed copied folders in `node_modules/@types`, not missing legitimate packages. Stop development/test servers and rebuild generated dependencies/output.

macOS:

```bash
rm -rf node_modules .next
nvm use
npm ci
npm run verify
```

Windows PowerShell:

```powershell
Remove-Item -Recurse -Force node_modules, .next -ErrorAction SilentlyContinue
npm ci
npm run verify
```

Run these only inside the project. `node_modules` and `.next` are generated; your source and `.env.local` are separate. Do not install fake packages with those names or weaken TypeScript checks. Never copy `node_modules` from another installation. If numbered folders reappear after a successful reinstall, check whether a sync, restore, or copy process is recreating generated files. The folder names alone do not identify the cause. Keep active dependencies out of conflicting synchronization workflows; changing TypeScript settings will not repair them.

### Migration script says DATABASE_URL is missing

Make sure `.env.local` is beside `package.json`, with exactly one nonempty `DATABASE_URL=` entry. A later duplicate blank entry can override the intended value. This command checks presence without printing the value:

```bash
node --env-file=.env.local -e "console.log(process.env.DATABASE_URL?.trim() ? 'DATABASE_URL is set' : 'DATABASE_URL is missing')"
```

It does not validate the password or network. For connection failures, check direct/Session Pooler settings, database password, TLS and project availability. Never paste the connection string into an issue.

### Confirmation or recovery email fails

Check Gmail 2-Step Verification, the App Password, matching sender/username, spam folders, Supabase Auth logs and rate limits. Google may revoke App Passwords after an account password change. Check that templates and redirect allowlists match the environment where the request began. A SiteURL-based template always points to the project's Site URL.

### AI generation fails but saved words work

Check the fixed server error category, OpenAI project/model access, current credits and request limits. Ensure the private key is in the correct Vercel environment and redeploy after changing it. Malformed-lesson guidance is different from provider-unavailable guidance. Local starter words succeeding does not prove live AI works.

### Changes or progress seem missing

Check the account, selected timezone, archive/search filters and connectivity. A revision conflict means another tab changed the account: reload before retrying. Check that migrations are applied and Supabase is available. Clearing browser storage removes demo data; real account data is stored in Supabase.

### Deployment succeeds but the app fails

Inspect runtime logs and follow the post-deployment checklist. Check missing environment values, wrong origins, paused database, SMTP delivery and OpenAI billing. Route symbols such as static, dynamic and proxy in the build output describe how Next.js serves routes; they are not evidence of a runtime failure.

## Security, cost and operations

Secrets stay in ignored `.env.local`, Vercel's private environment or Supabase SMTP settings. Do not commit them, put them into screenshots, or prefix them with `NEXT_PUBLIC_`. `lib/db`, OpenAI and Cambridge provider modules have server-only import boundaries. Mutating APIs check the exact request origin and verify identity before privileged work. Authentication cookies are HttpOnly and SameSite=Lax, and Secure in production; session refresh follows Supabase SSR patterns.

No analytics, payment system, Redis, cron job, storage bucket or external font service is required. Learners do not supply their own OpenAI keys. The code can be developed locally with free tools, but running the complete live app is not guaranteed to be free: OpenAI bills usage and other services have plan limits. Gmail is the private deployment's email choice; transactional email and custom domains are optional future costs.

Capacity depends on actual usage, email delivery, database size, hosting resources and AI cost. There is no fixed guaranteed user count. Review current [Supabase plans](https://supabase.com/pricing) and [Vercel plans](https://vercel.com/pricing); account for plan-specific inactivity and backup behavior. Vercel Hobby has personal/non-commercial restrictions. Use an appropriate plan if the app's purpose changes.

Back up the database according to the importance of its data and test restoration separately. A learner's JSON export is not a complete server backup. Account deletion is currently operator-managed through Supabase Auth and cascades private records; shared lesson content remains. Rotate any exposed credential with its provider, update the relevant configuration and redeploy as necessary.

## Optional learning tutorials

Choose **Show me how** in the optional invitation to enable the pocket guides. Each main page explains its goal and controls in short steps. Use **Next tip**, **Back tip**, or a step title to explore, and **Hide guide** to return to practice. **Got it, let’s try** closes the guide; **Open guide** replays it.

Choose **No thanks** or **Turn off tips** to dismiss tutorials. Re-enable them in **Settings → Learning tips**. This preference is stored in this browser, not synced between accounts or devices; if browser storage is unavailable, it works for the current visit. The guides are optional, keyboard accessible, responsive, and use the current light/dark appearance without adding animation. They make no AI requests.

## Vocabulary experience: recommendations, recall and everyday use

### A recommended set you can edit

On Today, choose **Preview my recommendations**. Saved priority words rank first, followed by saved personal vocabulary and words matching your interests and selected level. Ties rotate deterministically by date. Archived, learned and dismissed words are excluded. Recommendations use existing available cards and do not trigger paid generation. Due words remain in Review rather than being relabeled as new words.

Select or deselect any word, then choose **Use these words**. The selected count (1–20) becomes today's goal without changing your usual goal. **Cancel changes** leaves the saved set alone. **Edit today’s set** remains available until starting. **Add a different word** opens the normal word-card flow. The starter pool is finite; if it runs out, add personal words. Recommendations are a convenience, never a mandatory curriculum.

### Practice that responds to mistakes

New words receive the full introduction and exercises. Completed sessions record correctness separately for meaning, context, distinction, typed recall and application. Reviews always begin with typed recall before revealing the answer. A skill with a mistake and fewer than 80% correct answers in its latest five measured attempts gets focused work: meaning questions, distinctions, application plus a personal sentence, or another recall attempt after context. These are exercises from the existing word card, not newly generated AI questions. As recent results improve, extra exercises drop away. Confidence still influences scheduling; it does not replace measured recall.

### Resume a saved lesson or review

The current question, selected answer, typed answer, feedback state, personal sentence and confidence autosave after a 400ms pause. Watch **Your place is saved**. The close control and ordinary in-app links flush pending answers before navigation. A failed save displays retry guidance; reconnect and choose **Retry save** before leaving. The browser is asked to warn on closing with unsaved changes, but abrupt device shutdown or a killed browser cannot be guaranteed to preserve unsaved keystrokes. There is no offline account write queue.

Open Learn or Review and choose **Resume saved lesson/review**. Each account can hold one draft of each kind; starting a replacement requires explicitly discarding the old unfinished session. Discarding does not erase completed words. A saved lesson keeps its original daily set even if resumed after midnight, while practice activity is dated when completed. The final word result and the next word's checkpoint commit atomically. Account drafts live in Supabase; demo drafts live only in this browser. Another active device can cause a revision conflict, in which case reload rather than overwrite newer progress.

### Capture a word before you forget it

Today includes **Quick capture inbox**. Enter a word or expression and optionally paste the original sentence into Context. **Save to inbox** stores it immediately without calling AI or creating a dictionary card. Edit or remove captures later. **Build this word card** opens Add a word with your capture and context filled in. The capture is removed only after a new card is successfully saved. Captures of words already in the collection stay in the inbox until manually removed. Up to 100 captures are retained; the app asks you to clear space rather than silently deleting old entries.

### Put several words into one real thought

In **Use words together** on Today, choose two or three saved words and a situation from your life. Write a short message or thought, check the meanings, and reflect on whether you feel ready to use the words or want to revisit the wording. The presence check looks for the displayed word forms; it does not judge semantic correctness or grammar. A saved reflection does not increase recall accuracy, change the spaced-review schedule, or award XP. No AI request is made. The private practice journal retains up to 100 entries and supports explicit removal.

### Progress backed by memory evidence

Progress now separates active words saved, words recalled after a delay, correct delayed recall attempts, and words the user feels ready to use. Delayed recall means the first typed recall result in a completed review at least 24 hours after the previous practice. Same-day repetitions, confidence ratings and historical sessions without skill evidence are not counted. These counters persist with each word, so the 100-event dashboard window does not truncate them. A repeated recall after feedback does not replace the first attempt in this metric. Ready-to-use counts are explicitly self-reported from the retained practice journal, not verified conversational ability. Archived words are excluded from these cards. Resetting a review schedule retains measured history.

### Contextual guidance

Enable **Learning tips** in Settings or accept **Show me how**. Short tips appear alongside daily-set editing, capture, word-use practice, saved sessions, confidence ratings and memory evidence. **Got it** dismisses an individual tip in this browser. **Replay contextual tips** in Settings restores them. The page walkthroughs also explain the new flows. Users who turn tips off do not see contextual tips.

### Upgrade and acceptance checks

1. Back up your database using your existing operational process.
2. From the existing LexiLoop directory, run `npm run db:migrate` with your private database configuration. Confirm `003_vocabulary_practice.sql` and `004_remove_saved_words.sql` are in the ledger, then run `npm run db:seed`.
3. Run `npm run verify` and `npm run test:e2e` locally.
4. Deploy the updated code to the existing project.
5. With a real account, accept an edited recommendation, capture a word, and pause a lesson. Reopen it on another signed-in device and check the exact answer and position. Then verify word-use journal entries and export.

Automated coverage uses isolated demo browser journeys, account-state fixtures and real migration/RLS checks in embedded PostgreSQL. It does not prove that migration 003 has been applied to your hosted project or replace a real cross-device acceptance check. No live database migration or deployment is performed just by editing this repository.

### Mixed lessons, search, and original scenes

A new daily lesson introduces the whole selected set before testing. For example, ten active learned words plus five new words produce practice for all fifteen. Exercise rounds shuffle word order, while preserving each word's teaching sequence. Recent mistakes add targeted exercises for earlier words. Each completed word updates its own schedule and evidence once; the next checkpoint commits in the same transaction. The full task order, per-word answers, personal sentences, and position survive reloads and midnight. Older saved lesson formats remain readable. Longer sessions can be paused; they are not truncated to the separate Review page's thirty-word batch.

Search ignores the source tab, category and level while text is entered, so a specific saved or suggested word remains findable. Clear the search to return to browsing filters. Saved priorities can still be recommended outside the selected difficulty because the learner explicitly chose them. Existing saved cards retain their stored explanations when a library update introduces the same spelling.

Word details and the introduction phase include an expandable **original mini-scene**, a meaning explanation, and a situation to connect to daily conversation. Many expanded examples use fictional comedy, mystery, or adventure settings. They are not quotations from Friends, The Office, It's Always Sunny, or any existing film or game. No licensed screen-dialogue collection or new dictionary integration is included. Contextual tips explain search, mixed practice, and removal when those controls appear, following the user's existing tips preference.
