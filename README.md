# LexiLoop

**Small steps. Lasting words.**

Documentation last verified: **2026-09-12**

LexiLoop is a Next.js vocabulary app for individual email/password accounts. Choose a daily mix of personal and suggested words, complete interactive lessons, and revisit words through spaced repetition. Supabase holds account data; OpenAI creates new lexical lessons; Cambridge is a separate, optional licensed reference.

This is an existing application that has been audited and updated, not a replacement starter project. Start with this guide. The code is locally verified; creating your service accounts, delivering real email, approving Cambridge access, and deploying your public domain still require your own accounts. No credentials are included.

Official documentation was checked on the date above. I did not sign into your service dashboards. Some Cambridge pages rejected direct automated retrieval; their official indexed specification, FAQ and terms, plus the accessible registration page, were inspected. The links below let you verify the current pages and your actual agreement. Dashboard wording can vary by account or rollout.

## What you have

- Normal signup, sign-in, sign-out, email confirmation, forgot-password and reset-password flows.
- Private per-user profiles, names, goals, interests, level, timezone, reminders, theme and reduced-motion preference.
- Personal word preview, notes, original context, tags, priority, saved suggestions, favorites and archives.
- Atomic save-and-select, daily slot limits, replacement before start, locked started sets, and safe midnight completion.
- Eight learning phases, varied exercises, personal sentences, confidence, corrective examples, and genuine review scheduling.
- Database-generated lifetime progress totals; normal loads fetch only recent events/daily sets. Full history is available through an explicit export.
- OpenAI structured generation with validation/retry, canonical caching, inflection aliases, durable daily quotas and generation leases.
- A Cambridge section on every word detail. It shows an external link unless licensed API lookup is configured. Cambridge content never enters the lexical database or AI prompt.
- Responsive mobile layouts, safe-area navigation, PWA icons/manifest, public-asset offline fallback, and honest in-app reminders.

**Production always disables the device demo and mock provider**, even if an old demo flag remains in your environment. The 20 original editorial starter lessons are reusable curriculum, not invented user activity or Cambridge text. An uncached custom word requires live OpenAI configuration. Your first account starts with no learned words, XP or streak.

## External-services audit

| Service                  | Why It Is Needed                                              | Required?                                         | Free/Paid                                                               | Credentials Needed                                                             |
| ------------------------ | ------------------------------------------------------------- | ------------------------------------------------- | ----------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| Supabase                 | Email/password authentication and PostgreSQL persistence      | Yes for real accounts                             | Free tier for initial use; paid plans for larger/operational needs      | Project URL, publishable key, secret key; database connection string for setup |
| OpenAI API               | Generates uncached custom vocabulary lessons                  | Yes for real custom generation                    | Usage billing; any promotional allowance depends on your account        | Project API key and an available structured-output model                       |
| GitHub                   | Stores source and connects automatic deployments              | Yes for this deployment workflow                  | Free repositories are sufficient                                        | Your GitHub login; local Git authentication, not an app environment variable   |
| Vercel                   | Runs Next.js pages and server routes over HTTPS               | Yes for the requested hosting workflow            | Hobby is personal/non-commercial; paid plans support broader usage      | Vercel login and GitHub installation authorization                             |
| SMTP/email provider      | Delivers verification and password-reset emails to real users | Yes for a public signup service                   | Provider-dependent; Resend example below has free and paid tiers        | SMTP host, port, username, password, sender identity; entered in Supabase      |
| Cambridge Dictionary API | Displays official dictionary entries in the app               | Optional; ordinary external link works without it | Application-specific approval/agreement; fees and rights are negotiated | API development key, licensed dictionary code; license confirmation flags      |

An email-sending domain may also be required by your chosen SMTP provider. The app itself can use Vercel’s supplied domain. There is **no** Google login requirement, analytics service, scheduled push backend, Redis, external font service, storage bucket or cron dependency. Notification permission testing uses the browser and does not require VAPID credentials.

Review current [Supabase plans](https://supabase.com/pricing), [OpenAI billing](https://help.openai.com/en/articles/9039756), [GitHub plans](https://github.com/pricing), [Vercel plans](https://vercel.com/pricing), and [Resend plans](https://resend.com/pricing). Supabase Free can pause after inactivity and does not include automatic backups; persistent storage is not a substitute for an operator backup plan.

## Start locally

1. Install **Node.js 24 LTS** with npm. Check `node --version` and `npm --version` in Terminal. This repository’s `.nvmrc` selects 24 if you already use nvm.
2. Unzip the repository. Open the `lexiloop` folder: it must contain `package.json`, `app`, `components`, and `supabase`.
3. In Terminal, type `cd `, drag that folder from Finder into Terminal, then press Return. Subsequent commands run inside that folder.
4. Install exactly the locked dependencies:

```bash
npm ci
```

For a **development-only device demo**, run `npm run dev:demo`, then open the local URL printed by Next.js. This has no accounts, no paid API calls, and only the editorial starter words. Demo data does not transfer into a real account. Stop the server with Control-C.

For real accounts, create a local environment file **only if you do not already have one**:

```bash
cp -n .env.example .env.local
```

Open `.env.local` in your code editor. It belongs beside `package.json`, not inside `app`. Keep the exact variable names. Do not put keys into source files, this README, a chat, or a Git commit. Leave the local app URL as `http://localhost:3000` and configure the services below. Restart the local server after changing environment values.

# Supabase Setup — Complete Beginner Guide

## Create the project

1. Open the [Supabase dashboard](https://supabase.com/dashboard), create an account or sign in, and verify your account email if requested. Your dashboard login is separate from the learner accounts you will create inside LexiLoop.
2. Create/select your organization, then choose **New project**. Use a name such as `lexiloop-production` so you can distinguish it from future experiments.
3. Generate a strong **Database Password** and save it in your password manager. This is neither your dashboard password nor a learner password.
4. Choose a region close to your intended users and, where practical, your Vercel server region. Confirm the plan shown before creating anything paid.
5. Choose **Create new project** and wait until provisioning finishes and the project dashboard opens. See the official [Supabase/Vercel setup](https://supabase.com/partners/vercel).

## Get the three application values

Open your project’s **Connect** dialog to find its project URL and publishable key. For individual keys, use **Settings → API Keys**. Create publishable/secret keys there if the project has none. Current Supabase terminology is **publishable key** (`sb_publishable_…`) and **secret key** (`sb_secret_…`); this code uses those names. See [API keys](https://supabase.com/docs/guides/getting-started/api-keys).

Copy these separately into `.env.local`:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_KEY
SUPABASE_SECRET_KEY=YOUR_SECRET_KEY
```

The URL and publishable key identify the project and can reach the browser. The secret key bypasses database RLS and **must remain server-only**. This application uses it only after verifying the signed-in user. Do not put it in a variable starting with `NEXT_PUBLIC_`. If upgrading the previous build, replace its old `SUPABASE_SERVICE_ROLE_KEY` variable with `SUPABASE_SECRET_KEY`; do not keep obsolete names as a second source of configuration.

## Get a database connection string

In **Connect**, choose the PostgreSQL connection string. For local migrations, use the direct connection if your network supports its address family, or **Session pooler** for an IPv4-only network. Copy the host and username exactly; do not infer them from the region. Replace the password placeholder with the saved database password. URL-encode reserved password characters when embedding them in a connection URL. Save the complete string as `DATABASE_URL` in `.env.local`. Use the connection’s TLS settings; do not disable certificate validation to bypass an error. See [connecting to PostgreSQL](https://supabase.com/docs/guides/database/connecting-to-postgres).

`DATABASE_URL` is used by the setup scripts on your computer. It is **not needed in Vercel**. Runtime requests use Supabase’s HTTPS API.

## Create tables and load starter words

Run:

```bash
npm run db:migrate
npm run db:seed
```

The first command applies every unapplied SQL file in filename order. It holds a migration lock and commits each migration with its ledger entry. The second inserts 20 original starter lessons and is safe to repeat. Do not manually recreate tables in the Table Editor.

A new database needs both `001_initial.sql` and `002_production.sql`. An existing installation that already applied 001 needs 002. Do not edit an already-applied migration in a live project; use a new forward migration for future changes. If you previously ran SQL manually without the migration runner, check which schema changes actually exist before using the runner: its ledger cannot infer manually applied files.

In **Table Editor**, you should see `profiles`, `words`, `word_meanings`, `word_examples`, `user_words`, `daily_word_sets`, `daily_word_set_items`, `review_events`, `suggestion_feedback`, quotas, aliases and generation leases. `words` should contain 20 rows after the seed. Private tables remain empty until you use the app.

For a read-only check in **SQL Editor**, run:

```sql
select name from public.lexiloop_migrations order by name;
select count(*) as starter_words from public.words;
select tablename, rowsecurity from pg_tables
where schemaname = 'public' order by tablename;
```

The migration ledger should list both files. All app tables should have RLS enabled. Owner-only SELECT policies protect private records; ordinary clients have no mutation policies. Server-only RPCs make authorized changes. Shared original lexical content is readable by authenticated users. SQL Editor normally runs with elevated privileges, so seeing all users there is **not** a test of client access. See [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security).

## Enable email/password accounts

Open **Authentication → Sign In / Providers** (the Email provider section), enable Email and keep **Confirm email** enabled. Google/Apple providers are unnecessary. Set a minimum password length of at least 12; the app applies that minimum to signup and new passwords while still allowing existing shorter passwords at sign-in.

Open **Authentication → URL Configuration**. For local testing, set **Site URL** to `http://localhost:3000`. Add these exact allowed redirect URLs:

```text
http://localhost:3000/auth/confirm
http://localhost:3000/auth/confirm?next=/reset-password
http://localhost:3000/reset-password
```

Use one hostname consistently: `localhost` and `127.0.0.1` are different browser origins. If you intentionally run a different port, update both the app URL and the allowed URLs. The [password-auth guide](https://supabase.com/docs/guides/auth/passwords) explains the signup and reset lifecycle; [redirect configuration](https://supabase.com/docs/guides/auth/redirect-urls) explains the allowlist.

## Set up real email delivery

Supabase’s default SMTP is for limited testing: it restricts recipients to project-team addresses and has a low sending limit. Public signup and recovery need **custom SMTP**. See [Supabase custom SMTP](https://supabase.com/docs/guides/auth/auth-smtp).

Use an SMTP provider you already have, or follow the Resend example in the next section. Enter its sender address/name, host, port, username and password in **Authentication → Email → SMTP Settings** (Email is under Notifications in the documented dashboard). Save, and check Authentication’s email rate limits against your intended usage. SMTP credentials belong in Supabase, not in the app’s Vercel environment.

## Email templates for server-side confirmation

After custom SMTP is configured, open Authentication’s **Email Templates**. Keep the surrounding email copy, but set the action link in **Confirm sign up** to:

```html
<a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email"
  >Confirm your LexiLoop email</a
>
```

Set the action link in **Reset password** to:

```html
<a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=/reset-password"
  >Reset your LexiLoop password</a
>
```

Leave the template placeholders exactly as shown; Supabase substitutes them. The callback verifies the token server-side and creates HttpOnly cookies. It also supports the PKCE `code` flow used by default templates, but token-hash templates are preferable when opening the email on another device. Keep your Site URL accurate. Disable email-provider click tracking for these authentication links. See [email templates](https://supabase.com/docs/guides/auth/auth-email-templates) and [SSR cookies](https://supabase.com/docs/guides/auth/server-side/creating-a-client).

If template editing is unavailable, confirm that custom SMTP is saved and check your current plan’s dashboard restrictions. Do not substitute a fake confirmation page.

## Verify Supabase locally

Start `npm run dev`. Create an account with a real email you control, open the verification email, then sign in. Set a display name and save a word. Reload, sign out, and sign back in: the same private data should return. Check the account in Authentication → Users and its matching UUID in `profiles`/`user_words`.

If signup email does not arrive: check spam, SMTP sender verification, provider delivery logs, Supabase Auth logs and email rate limits. If a link points to the wrong place: check `NEXT_PUBLIC_APP_URL`, Site URL, allowed redirects, the template and whether you restarted/redeployed. If the app says storage or summaries are unavailable: verify all migrations and that the project is not paused. A publishable key is not a replacement for the server secret key.

# SMTP Setup — Resend Example

Resend is an example you may choose, not an additional mandatory vendor if you already have working SMTP.

1. Create an account at [Resend](https://resend.com). Open **Domains → Add domain** and enter a domain or sending subdomain you control, such as `mail.yourdomain.com`.
2. Resend supplies DNS verification records. Add those exact records at the DNS provider for that domain, then use Resend’s verification control and wait for a verified result. Owning a Vercel subdomain does not give you DNS control over `vercel.app`.
3. Open **API Keys → Create API Key**. Name it for LexiLoop email, restrict it to sending and the verified domain where available, and save the shown secret in your password manager.
4. In Supabase SMTP Settings, set host `smtp.resend.com`, port `465`, username `resend`, and password to that Resend key. Use a sender on the verified domain and a recognizable name such as `LexiLoop`.
5. Save and test signup and recovery from the app. Check Resend’s delivery logs when diagnosing an email failure. No Vercel redeploy is needed merely to change Supabase SMTP settings.

Follow [Resend’s Supabase SMTP guide](https://resend.com/docs/send-with-supabase-smtp) and [domain verification guide](https://resend.com/docs/dashboard/domains/introduction). A common mistake is using the testing sender for arbitrary public recipients or copying the key into the app instead of Supabase. Check the current free-tier/day limits before inviting users.

# OpenAI Setup

1. Open the [OpenAI API platform](https://platform.openai.com) and sign in/create an account. A ChatGPT subscription and API billing are separate.
2. In platform settings, choose your organization and a project for LexiLoop; create a project if you do not have one. Keep development and production billing/keys separate if you operate both.
3. Open the project’s **API keys** page, choose **Create new secret key**, give it an identifying name, and permit Responses API requests for the selected model. Copy the secret when it is shown and store it securely.
4. Open **Billing** from the platform settings and complete any required payment/credit setup. Check project limits and usage notifications. An API key existing does not prove the account can make paid calls.
5. Set these values in `.env.local`, and later in Vercel’s Production environment:

```dotenv
NEXT_PUBLIC_DEMO_MODE=false
MOCK_AI=false
AI_PROVIDER=openai
OPENAI_API_KEY=YOUR_PRIVATE_OPENAI_KEY
OPENAI_MODEL=gpt-4.1-mini
```

The configured model must be available to your project and support structured outputs. The app uses the official SDK’s Responses API with `store:false`; it sends only the normalized word, not your notes or sentences. See [API setup](https://developers.openai.com/api/docs/quickstart), [structured outputs](https://developers.openai.com/api/docs/guides/structured-outputs), and [billing separation](https://help.openai.com/en/articles/9039756).

6. Restart locally, or redeploy on Vercel. Sign in and build a word outside the starter catalog, for example `meticulous`. Inspect its card, save it, reload, and confirm it remains in My words. Check `words` and `word_aliases` in Supabase. Request the same normalized word again: it should reuse canonical content instead of billing another generation.
7. Confirm activity in your OpenAI project’s Usage page. If it fails, check model access, billing, the exact key, Vercel environment scope, and deployment logs. Do not enable mocks to hide a provider error.

The app allows 20 new generation attempts per account per UTC day. Failed generation attempts count; the bounded validation retry belongs to the same attempt. Cache hits do not consume the quota. Concurrent requests for the same input use a 90-second database lease. Quotas are per account, so use sensible signup controls and provider spending alerts for a public app. AI validation checks structure and exercise integrity, not a guarantee of linguistic truth.

# Cambridge Dictionary Setup

## Access and approval

1. Begin at the [Cambridge developer resources](https://dictionary.cambridge.org/develop.html), then the [API developer hub](https://dictionary-api.cambridge.org/). Read its [terms](https://dictionary-api.cambridge.org/api/terms-and-conditions), [FAQ](https://dictionary-api.cambridge.org/api/faq), and [specification](https://dictionary-api.cambridge.org/api/specification).
2. Use [Registration](https://dictionary-api.cambridge.org/registration). Supply your name, username, password, email, organization/contact details and intended use honestly. If you are an individual and a field is unclear, ask Cambridge how to complete it rather than inventing an organization.
3. Evaluation access is not public-app permission. The published terms describe a limited evaluation allowance of 3,000 calls over 30 days. For an application, use **Apply** / the [licensing query page](https://dictionary-api.cambridge.org/apply) to request an application-specific development key and agreement. Approval, permitted use and price require Cambridge’s decision; do not assume an instant free production key.
4. Describe this project, for example: “A mobile web vocabulary-learning app with individual email/password accounts. Users request a Cambridge reference beside independently generated learning exercises. We would display unmodified entries and attribution on demand, without storing entries, redistributing a dictionary dataset, or sending dictionary content to AI. Please confirm permitted dictionary datasets, audio playback, traffic limits, attribution/branding and public deployment rights.”
5. Follow Cambridge’s account instructions for evaluation access and its licensing correspondence for the application key. The public pages do not establish a guaranteed dashboard location or delivery time for your eventual licensed key. Ask the licensing contact if the key has not been supplied; never copy a sample key from a tutorial.

## Configure the licensed integration

Leave all Cambridge values blank/false while approval is pending. The normal lesson and external dictionary link work immediately.

When Cambridge grants the rights you need, obtain the **dictionary code** for your licensed English dataset through its API **Demo → getDictionaries** or the official getDictionaries request. Copy the returned `dictionaryCode`; a dictionary’s display name is not its code. Configure:

```dotenv
CAMBRIDGE_API_KEY=YOUR_APPLICATION_SPECIFIC_KEY
CAMBRIDGE_DICTIONARY_CODE=YOUR_LICENSED_DICTIONARY_CODE
CAMBRIDGE_LICENSE_CONFIRMED=true
CAMBRIDGE_AUDIO_LICENSE_CONFIRMED=false
```

`CAMBRIDGE_API_KEY` is the exact variable this repository uses. The server sends it as the API’s `accessKey` request header; it never goes to browser JavaScript. `CAMBRIDGE_LICENSE_CONFIRMED` is this app’s operator switch, not a Cambridge credential or proof of rights. Enable audio separately only when the agreement permits it.

Put these in `.env.local` locally and **Vercel → Project → Settings → Environment Variables → Production** for the deployed app. Restart/redeploy. Open a saved word’s detail and press **Look up in Cambridge**. The dedicated section should show the full first matching official entry, with its canonical source link. Part of speech, senses, labels, examples and IPA appear as supplied; missing fields are not fabricated. Other entries remain accessible through Cambridge’s website. If licensed audio is enabled and returned, British/American playback controls appear.

Use the Cambridge API Demo to diagnose dataset/key permissions. An invalid key, unavailable dataset, no result, rate limit, malformed response or network failure produces a small fallback message without discarding the lesson. Audio failure does not hide a valid definition. The app limits lookups to 100 per account per UTC day; an audio-enabled lookup can make an additional upstream request. Your agreement can require a lower limit—adjust the quota migration before launch if needed.

## Storage, attribution and boundaries

The published default terms restrict copying/caching content and require a separate development agreement. Your actual agreement controls public use, branding, links, audio and fees. Keep every supplied notice. This implementation renders unmodified entry HTML inside a script-disabled frame, adds attribution and links, and uses `no-store` requests/responses. It does not persist Cambridge text in Supabase, local storage, exports, service-worker caches or AI prompts. Native audio uses `preload="none"`. The developer resources list widgets, but no widget was embedded because its suitability/licensing was not established; a normal source link is the fallback.

Review the rendered section against your signed agreement before enabling the license flag. If it requires specific additional wording or a logo, apply those requirements before public use. Do not remove notices, rewrite a definition as Cambridge’s, or turn on storage to reduce bills without explicit storage rights.

# Environment Variables

Set application variables in `.env.local` for local use. In Vercel use **Project → Settings → Environment Variables**, select the appropriate scope, save, then redeploy. `NEXT_PUBLIC_` values are built into browser assets; changing them always needs a new build.

| Variable                               | Exact source/value                                                                | Public or secret        | Local                   | Vercel Production                       | Preview / Development                                 |
| -------------------------------------- | --------------------------------------------------------------------------------- | ----------------------- | ----------------------- | --------------------------------------- | ----------------------------------------------------- |
| `NEXT_PUBLIC_APP_URL`                  | Your local origin; later the stable HTTPS Vercel/custom origin, no trailing slash | Public                  | `http://localhost:3000` | Final app origin                        | Exact isolated preview origin / local origin          |
| `NEXT_PUBLIC_SUPABASE_URL`             | Supabase Connect → Project URL                                                    | Public                  | Required                | Required                                | Prefer separate test project                          |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase Settings → API Keys → Publishable key                                    | Public                  | Required                | Required                                | Test project’s key                                    |
| `SUPABASE_SECRET_KEY`                  | Same project → Secret key                                                         | **Secret, server only** | Required                | Required                                | Test project’s secret                                 |
| `DATABASE_URL`                         | Supabase Connect → PostgreSQL direct/session connection string                    | **Secret**              | Migration/seed only     | Omit                                    | Omit unless explicitly running setup in controlled CI |
| `OPENAI_API_KEY`                       | OpenAI project → API keys                                                         | **Secret, server only** | Real generation         | Required for custom generation          | Separate restricted test key if needed                |
| `OPENAI_MODEL`                         | Model available to that project                                                   | Server configuration    | `gpt-4.1-mini`          | `gpt-4.1-mini` or your supported choice | Same supported choice                                 |
| `AI_PROVIDER`                          | Literal `openai`                                                                  | Server configuration    | `openai`                | `openai`                                | `openai`                                              |
| `MOCK_AI`                              | Literal `false`                                                                   | Server configuration    | `false` for accounts    | `false`                                 | `false` in deployed previews                          |
| `NEXT_PUBLIC_DEMO_MODE`                | Literal `false`                                                                   | Public                  | `false` for accounts    | `false`                                 | `false` in deployed previews                          |
| `CAMBRIDGE_API_KEY`                    | Cambridge application licensing process                                           | **Secret, server only** | Optional                | Optional                                | Only if license covers it                             |
| `CAMBRIDGE_DICTIONARY_CODE`            | Licensed dataset’s getDictionaries result                                         | Server configuration    | Optional                | Optional                                | Licensed dataset                                      |
| `CAMBRIDGE_LICENSE_CONFIRMED`          | `true` only after approval; otherwise `false`                                     | Server configuration    | `false` by default      | `false` until approved                  | Same rights check                                     |
| `CAMBRIDGE_AUDIO_LICENSE_CONFIRMED`    | `true` only for approved audio playback                                           | Server configuration    | `false` by default      | `false` until permitted                 | Same rights check                                     |

Vercel sets `NODE_ENV`; do not create your own Vercel override. The optional test-run variables are `E2E_BASE_URL`, `E2E_SCREENSHOTS`, `E2E_AUTH_UI`, `E2E_EMAIL` and `E2E_PASSWORD`. `E2E_AUTH_UI=true` enables the separate account-form fixture suite against an account-mode build. The email/password values are disposable test-account credentials, never application configuration or committed files. SMTP values are stored inside Supabase, so no unused SMTP variables appear here. Read [Vercel environment variables](https://vercel.com/docs/environment-variables).

# Publishing This Project to GitHub

## Create the GitHub repository in the website

Create/sign into [GitHub](https://github.com). Choose **+ → New repository**, select your account as owner, name it `lexiloop`, and choose Private unless you intend to publish the source. Leave initialization options for README, .gitignore and license unchecked: this folder already includes them. Create the repository and keep its HTTPS remote URL handy. See [creating a repository](https://docs.github.com/en/repositories/creating-and-managing-repositories/creating-a-new-repository).

The delivered folder currently has no Git history or remote. If you already placed it inside a Git repository, inspect `git status`, `git rev-parse --show-toplevel`, and `git remote -v` first. **Do not initialize a second repository or replace a remote blindly.** Use that existing repository’s workflow.

## Terminal workflow for this new folder

Run these inside the `lexiloop` folder, only when it is not already a repository:

```bash
git init -b main
git status
```

Before staging, verify `.gitignore` contains `.env*` with only `.env.example` allowed, plus `node_modules/`, `.next/`, test reports and build metadata. Check:

```bash
git check-ignore .env.local node_modules .next
git add .
git diff --cached --stat
git diff --cached --name-only
```

Inspect the filenames before committing. They must not include `.env.local`, real keys, database exports, `node_modules`, `.next`, personal logs or test-account passwords. `.env.example` contains blank/example values and is intentionally included. If a sensitive file is staged, use `git restore --staged FILE_NAME` and fix the ignore rule; if a key was previously committed or shared, revoke it with its provider.

Then:

```bash
git commit -m "Prepare LexiLoop for production"
git remote add origin https://github.com/YOUR_USERNAME/lexiloop.git
git push -u origin main
```

Replace `YOUR_USERNAME` with the actual owner from GitHub’s remote URL. Authenticate using GitHub’s supported credential flow, SSH, or GitHub CLI; your ordinary account password is not a Git HTTPS password. If Git asks for author identity, configure your own name/email locally with `git config user.name` and `git config user.email`, then retry the commit. See [adding local code to GitHub](https://docs.github.com/en/migrations/importing-source-code/using-the-command-line-to-import-source-code/adding-locally-hosted-code-to-github).

Refresh GitHub. `package.json`, `app`, `.env.example` and the README should be at the repository root. If instead you see only a `lexiloop` folder, either move the contents to the root or select that subfolder as Vercel’s Root Directory.

## Optional website upload

Use the **clean source ZIP**, extract it into a new folder, and upload its contents through **Add file → Upload files**. Do not upload the ZIP as a single file. Include hidden configuration files; Finder’s Command-Shift-period reveals them. GitHub permits up to 100 files in one web upload, so this expanded repository may need multiple batches. Review the pending filenames and commit message, then commit/propose the upload. The terminal workflow is less error-prone for the complete project. See [uploading files](https://docs.github.com/en/repositories/working-with-files/managing-files/adding-a-file-to-a-repository).

# Deploying to Vercel

1. Create/sign into [Vercel](https://vercel.com) using the account you want to own the app. Choose a plan that covers your use; Hobby is for personal non-commercial projects.
2. Choose **Add New → Project**, connect GitHub, and authorize access to the `lexiloop` repository. Select it and choose **Import**. If it is missing, check the GitHub installation’s repository access and your ownership permissions.
3. Use a recognizable project name. Choose **Next.js** as the framework. Root Directory should be the folder containing `package.json`: normally the repository root.
4. Use Node.js **24.x**, install command `npm ci`, build command `npm run build`, and the framework’s default output. Do not use static export; this app requires server routes and cookies.
5. Enter the **Production** environment values from the table above. Omit `DATABASE_URL`. Leave Cambridge disabled unless approved. Use `AI_PROVIDER=openai`, `MOCK_AI=false`, `NEXT_PUBLIC_DEMO_MODE=false`.
6. If Vercel has not yet assigned the stable domain, leave `NEXT_PUBLIC_APP_URL` unset for this first deployment. Email-link actions will fail clearly until the next section is completed. Do not invite users or test signup on this initial deployment.
7. Choose **Deploy**, open the deployment’s build logs and wait for **Ready**. Copy the stable project domain shown in the project’s Domains/overview, rather than a temporary per-commit URL.

Vercel’s Git integration builds future pushes to the production branch and creates branch previews. See [Git deployment](https://vercel.com/docs/git) and [GitHub integration](https://vercel.com/docs/git/vercel-for-github). Keep preview credentials isolated from real-user data. Avoid broad wildcard authentication redirects for untrusted preview branches.

If a build fails, open the failed deployment’s build log and fix its first real error. Verify Node version, repository root, lockfile, migrations and environment scope. A successful build alone does not verify SMTP, database credentials or billing.

# After Vercel Gives You Your URL

Suppose Vercel assigns `https://your-project.vercel.app`. Replace that example with the actual origin everywhere below.

1. In **Vercel → Project → Settings → Environment Variables**, set `NEXT_PUBLIC_APP_URL` to the stable origin, with HTTPS and no trailing slash. Save for Production.
2. In **Supabase → Authentication → URL Configuration**, set Site URL to that same origin. Keep local redirect entries if you still need local testing. Add:

```text
https://your-project.vercel.app/auth/confirm
https://your-project.vercel.app/auth/confirm?next=/reset-password
https://your-project.vercel.app/reset-password
```

3. Verify the signup/reset templates still contain the placeholders shown earlier. Because these templates use Site URL, changing Site URL changes where new email links land. Use a separate Supabase project if you need local and production email destinations simultaneously.
4. In Vercel’s **Deployments** tab, redeploy the current production deployment so the public app URL is rebuilt into the app. Wait for Ready, then open the stable URL again.
5. Run `npm run check:production` in an environment containing the intended production values. It checks names, HTTPS origins and modes without printing secrets; it does not contact or authenticate the providers. Keep your normal local `.env.local` on localhost for local work.
6. Perform the real-account checklist below before inviting others.

A custom app domain is optional. If you add one under **Settings → Domains**, follow Vercel’s supplied DNS records, wait for HTTPS, choose one canonical origin, and repeat the app URL, Supabase URL/template and redeployment steps. See [adding a domain](https://vercel.com/docs/domains/working-with-domains/add-a-domain). Your email sender domain and your app domain may differ.

# iPhone Installation

Open the final HTTPS URL in **Safari** on your iPhone. Use **More → Share** (or the Share button in your Safari layout), then **Add to Home Screen**. Turn on **Open as Web App** if shown, keep the app name, and tap **Add**. If the option is lower in the share sheet, scroll down; use Edit Actions if it is missing. See [Apple’s installation guide](https://support.apple.com/guide/iphone/open-as-web-app-iphea86e5236/ios). Launch the new icon and sign in there; the installed app may require its own sign-in even if Safari is already signed in. Do not test installation using the computer’s `localhost` URL.

Check the bottom navigation above the home indicator, form scrolling with the keyboard open, password-manager autofill, portrait/landscape, and the full daily ring. Public icons/assets are available offline; a cold offline launch shows reconnect guidance. Private account HTML and API responses are deliberately not cached. An already-open word can remain readable in memory, but offline writes are not reported as saved.

## Reminders

In Settings enable the in-app reminder and choose your time/timezone. The banner appears while the app is open or when you return after that time. **This version does not schedule background push notifications.** The permission button sends an immediate test where the browser supports it; it is not a scheduled reminder. No cron or push credentials are needed. For a guaranteed closed-app reminder, create an ordinary phone reminder to open LexiLoop.

# Verification and Daily Use

## Local commands

```bash
npm ci
npm run lint
npm run typecheck
npm test
npx playwright install chromium
npm run test:e2e
npm run build
npm start
```

Run tests with no competing dev server on the same folder/port, or set `E2E_BASE_URL` to the intended existing test server. Browser learning tests deliberately use the development demo to avoid creating paid content or modifying real accounts. They test the same reducer and UI; database and route tests separately verify PostgreSQL/RLS and server behavior. Production disables demo mode, so `npm start` requires configured services for actual learning. The [verification report](docs/verification.md) states exactly what was run and what still needs live credentials.

## Real-account acceptance checklist

Use two separate browser profiles (or one normal and one private window), plus two real email addresses you control. Do not use your only admin email for destructive account tests.

1. **Account A:** create an account, check confirmation-sent feedback, confirm email and sign in. Check the display name and blank initial progress. Enter a wrong password once and verify a clear error without a crash.
2. **Recovery:** sign out, request a reset, open the email, set matching new passwords, and sign in with the new password. Try an expired/used link and verify guidance. Request a reset for an unregistered address: it should not reveal whether that account exists.
3. **Persistence:** save a note, favorite and settings. Reload and sign in on a second device. Check that the same data remains. Sign out and attempt to open `/collection` or `/api/state`; private data must be unavailable.
4. **Isolation:** sign into Account B in the other browser. It must not show A’s words, notes, preferences, daily set, reviews or progress. Add different data in B and return to A. In a test environment, use a normal user token to query other-owned rows directly: RLS must return none, and direct client writes/privileged RPCs must be denied. Do not use the secret key for this check.
5. **Real AI:** generate an uncached word, inspect every required field, save it, and reload. Check OpenAI usage and the canonical database row. A repeated lookup should use the cache. Missing/bad keys must yield a useful error, never a fake lesson.
6. **Daily composition:** add three personal words and two suggestions. Replace one before starting. Start and confirm replacement is locked. Complete all five words through every phase, including sentences and confidence. Reload: five completed words, XP and next review dates must remain.
7. **Reviews:** after a due time (or using a disposable test account with controlled test dates), complete a due review. Incorrect recall should schedule about ten minutes later; confident repeated success should expand intervals. Check older learned words remain reviewable.
8. **Cambridge:** without a license, check the external link. With licensed configuration, test entry display, attribution, alternate-entry link, missing-word fallback and optional UK/US audio. Inspect browser requests: no Cambridge or OpenAI secret key should appear. Export the wordbook: it must contain no Cambridge content.
9. **PWA/network:** install from iPhone Safari, close/reopen, verify session behavior, enable airplane mode and confirm honest offline guidance. Reconnect before saving. Verify there is no horizontal clipping on forms, quizzes or navigation.
10. **Operations:** verify rate limits, provider billing notifications, a backup/recovery process, the intended privacy policy and a working way for users to contact you. Account deletion is currently operator-managed through Supabase Auth; deletion cascades private rows while shared vocabulary remains.

## What is intentionally limited

The device demo is local-only. Real accounts use Supabase. The bundled suggestions are a finite original starter curriculum, ranked by interests, level, saved/dismissed words and weak-category practice; arbitrary new vocabulary comes through Add a word. Personal sentences receive a word-presence check and self-assessment, not AI grading. This is a personal practice tool, not a credential or competitive exam. Completed words persist; an unfinished word restarts if you navigate away. Review scheduling is an explicit SM-2-inspired heuristic, described in [scheduling](docs/spaced-repetition.md).

Cambridge approval, actual provider content rights, real email delivery, OpenAI billing/model access, a public Vercel deployment and physical-iPhone behavior cannot be proven by local fixture tests. Complete the live checklist after connecting your services. No background push service or invented completion claim is included.

## Code map

`app/` contains protected/public pages and server endpoints; `components/` holds the UI; `lib/domain.ts` owns learning rules; `lib/spaced-repetition/` owns scheduling; `lib/ai/` owns original generation; `lib/dictionary/` owns Cambridge; `lib/db/` owns authenticated persistence; `supabase/migrations/` owns SQL; `tests/` contains domain, provider, route, database and browser checks.

See [architecture](docs/architecture.md), [AI content](docs/ai-content.md), [audit](docs/production-audit.md), and [verification](docs/verification.md). No service credentials, private learner data, generated build output or dependency folders belong in the source archive.
