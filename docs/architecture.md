# Architecture and invariants

Next.js pages call `protectPage`; API routes independently verify the Supabase user. The cookie-refresh proxy updates request/response cookies. HttpOnly, SameSite=Lax cookies are Secure in production. Identity comes from Supabase Auth, never a user ID submitted in a command.

`readState` uses the signed-in user's client and RLS. Collections/dismissals use explicit ranges to avoid PostgREST's default row cap. Normal loads include at most 31 daily sets, 100 recent events, saved word cards and 60 level-matched recommendations. The 5,000-card library stays in PostgreSQL: Discover queries indexed summary columns in 24-card pages and loads full JSON only when a word is opened or used. The `learning_summary` invoker function computes lifetime totals, streaks and seven-day activity within RLS; old history is not transferred to the browser. Full history is fetched only on an explicit authenticated export.

Commands are schema-validated, applied by the pure reducer, and committed as changes: modified word documents, modified daily sets, newly recorded events and dismissals. The existing service-only `commit_learning_state` RPC upserts those deltas atomically under a profile row lock and expected revision. It does not delete omitted history. Revision conflicts fail explicitly. Event IDs and completed-word membership prevent duplicate awards; retries are checked against durable history even beyond the recent event window.

Settings are tied to the account profile. New Auth users receive a profile through a database trigger; existing profile settings merge with application defaults when read. The user can edit display name, goals, level, interests, timezone, reminder, theme and reduced motion. Metadata is presentation only, never authorization.

## Learning rules

- Default five slots, configurable 1–20; any personal/suggested composition.
- Save-and-select is one atomic command. A full/locked set cannot create a half-completed action.
- A started set cannot be replaced. Goal changes preserve started goals.
- Selected unfinished words are protected from timezone edits that change the calendar date.
- A started session carries its original daily-set date through midnight. Actual practice events use the local date of completion; review instants remain UTC.
- Completed words persist before advancing; unfinished interactions restart if the page is left.
- Words marked as already known stay in the personal wordbook but are removed from pending sessions and excluded from selection, recommendations, review queues and memory totals until restored to practice.
- Personal sentences use word-presence validation and self-assessment. They are not automatically graded for semantic correctness.
- A malicious learner can misreport quality for their own practice. This is not a leaderboard, certification system or proof of educational achievement.

## Providers

OpenAI receives only normalized vocabulary input. Canonical content and input-to-lemma aliases are shared; user notes/sentences are private. A word-generation lease reduces duplicate paid calls. Durable quotas bound attempts per user/day. Structured parse and semantic validation have a bounded retry, with no mock fallback in production.

The Cambridge control is an ordinary external link. No dictionary provider or API exists in the application runtime.

Confirmed Auth signups enter `signup_events` through a database trigger. The table is a private outbox with no learner policy. The installed Supabase Database Webhooks integration uses `pg_net` and its managed `supabase_functions` helper to call the Next.js handler. The request authenticates with a server secret; the handler claims a short lease, retrieves the email through the Supabase Auth admin API, and sends an idempotent Resend request. Failed rows retain bounded error text and can be retried by an allowlisted operator. `ADMIN_EMAILS` is checked after normal Supabase authentication for every user-management request. The browser never receives the Supabase server key, webhook secret or Resend key.

## Offline and account boundaries

The service worker allowlists public assets. It never caches private navigations or API/auth responses. Cold offline navigation gets a reconnect page. Offline writes fail rather than pretending to save. Demo persistence is allowed only in development and is visibly labeled. Production returns no mock provider even if old flags are supplied.

Sign-out navigates out of the authenticated app and notifies other same-origin tabs to clear/revalidate their state. Restoring a page from browser back/forward cache triggers a fresh read. A 401 clears client learning state and returns to sign-in. The protected route group owns one persistent client store and shell, so navigation between sections reuses loaded account state. Fonts have local system fallbacks without a remote font service.

Saved personal cards are still loaded for browsing/filtering and schedule counts; shared catalog transfer and history transfer are bounded. If a single learner eventually saves thousands of words, the private collection read can move to cursor pagination without truncating progress.
