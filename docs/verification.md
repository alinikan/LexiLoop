# Accent handling, known words, and navigation polish — 2026-09-19

The curated library now contains 401 cards, including `touché`. Unicode input and accent-insensitive comparison make `Touché` and `Touche` resolve to the same card. Add a word now reports exact library and personal duplicates, offers close spelling suggestions, and preserves an explicit choice to keep the typed spelling. Known words have a separate saved status and are excluded from daily sets, recommendations, lessons, review queues, and memory totals until restored to practice.

The protected app now uses one persistent layout and store across sections. Static page imports and Next link prefetching remove the repeated section workload screen. A pre-interactive theme script plus ready-gated theme persistence prevents dark mode from being overwritten during hydration. The initial account load uses a theme-aware skeleton. Discover cards open complete word details without saving; the original screen-scene panel and Cambridge API/provider have been removed. Word cards retain only an ordinary external Cambridge website link. Generated register guidance now permits complete sentences, while old cached fragments ending at the former limit display through their last complete sentence.

Validation passed with Node 24: lint, TypeScript, 114 unit/route/embedded-database tests, production configuration checks, and the optimized Next.js build. The final browser run passed 57 demo tests on desktop and mobile with three intentional screenshot/matrix skips, followed by all 12 account-fixture tests on desktop, tablet, and mobile. Coverage includes accent variants, autocorrection, duplicate notices, known-word filtering, clickable Discover details, dark reload/navigation, daily-ring label bounds at eight widths, cumulative learning, review persistence, and account flows. A clean `npm ci` repaired duplicate generated dependency folders; a follow-up scan found zero numbered duplicates.

These source changes are local until committed, pushed, and deployed. Run `npm run db:seed` against the intended database during deployment so the new curated card exists before an account saves it; the repeatable seed preserves existing word content and progress.

---

# Library expanded to 400 — 2026-09-14

Added 176 original cards in `data/more-words.ts`: 80 C1, 60 B2, 24 B1 and 12 A2. The complete library now has 400 unique words (38 A2, 55 B1, 109 B2, 198 C1). Each added card has two original examples and four exercises. A separate batch preserves earlier exercise choices. Increased the seed subprocess output limit because the serialized library now exceeds 1 MiB.

Validation passed: lint, TypeScript, 117 unit/database tests, production build, and four desktop/mobile browser checks covering search, difficulty filtering, and a full lesson and reload for the newly added word “equanimity.” Content checks cover uniqueness, word presence in both examples, cloze blanks and distinct exercise options. README counts are updated.

Seeded all 400 cards in the configured hosted database. No new migration was needed. Before/after fingerprints confirmed existing profiles, progress and stored cards remained unchanged; save-function access restrictions remain intact. Application code remains local and requires pushing/redeployment for the updated Discover library to appear on the hosted frontend.

---

# Discovery and cumulative lessons — 2026-09-13

Implemented combined saved/suggested search, strict difficulty browsing, a 224-word original library (26 A2, 31 B1, 49 B2, 118 C1), teaching before cumulative mixed exercises, owner-scoped word removal, original fictional scene examples, and contextual guidance. Saved custom cards and legacy lesson drafts remain compatible.

Validation:

- 116 unit/database tests pass, including 15-word coverage, weak-skill weighting, exact mixed draft persistence, removal without a zero-goal completion, revision conflicts, RLS, and preserved stored cards.
- Full browser suites: 51 demo tests and 12 account-fixture tests passed on desktop/tablet/mobile. Three skips are intentional: two optional screenshot captures and one duplicate mobile width matrix.
- After final keyboard-focus, tip-transition and XP-summary polish, six focused desktop/mobile browser checks passed, including full 15-word completion and a reload midway through the lesson.
- Recreated dependencies with `npm ci` from the unchanged lockfile and removed generated `.next` output. Clean verification passed: lint, TypeScript, all 116 unit/database tests and production build. A follow-up scan found zero duplicate dependency-copy paths.
- Source scan found no duplicate-copy files or conflict markers. Git object verification found no corrupt objects (only a harmless dangling empty tree).
- Credential scan across current files, reachable history and production browser assets found no exposed configured secrets.

Hosted database: applied `004_remove_saved_words.sql` and seeded all 224 library entries. Before/after fingerprints confirmed existing profiles, progress, saved words, daily sets/items, review events, suggestion feedback and previously stored teaching cards were unchanged. Verified anonymous/authenticated callers cannot execute privileged save functions; the service role can. No learner's real word was removed during verification. No paid AI generation or real email delivery was used in automated tests.

The application code is local and has not been pushed or redeployed by this task. The hosted database is ready for the code update. Original scenes are not quotations from licensed TV, film or games; the library is curated teaching material, not a complete dictionary. Earlier results below are historical.

---

# Hosted migration fix — 2026-09-13

Applied `003_vocabulary_practice.sql` to the configured Supabase database in response to the missing-migration error. The ledger now includes migrations 001, 002 and 003. Before/after comparisons confirmed existing profiles (excluding the new workspace column), words, saved words, daily sets/items and review events were unchanged. Verified the workspace JSONB column, enabled profile RLS, service-role save access, and blocked authenticated/anonymous direct RPC writes. Requested PostgREST schema reload. This supersedes the earlier statement that migration 003 had not been applied. No app code deployment was required for this database fix.

---

# Vocabulary experience verification — 2026-09-13

This is the latest verification for the editable recommendations, adaptive practice, resumable sessions, multi-word usage, memory evidence, capture inbox and contextual tips update. Earlier maintenance results are retained below as history.

| Check                                                                    | Final result                                                                                         |
| ------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------- |
| `npm run verify`                                                         | Passed from clean `.next` output: lint, TypeScript, 108 tests across 10 files, and production build  |
| `E2E_SCREENSHOTS=true npx playwright test --config playwright.config.ts` | 49 passed; 1 intentional duplicate mobile-matrix skip                                                |
| `npx playwright test --config playwright.auth.config.ts`                 | 12 passed across desktop, tablet and phone configurations                                            |
| Source integrity                                                         | UTF-8 text and JSON checks passed; no numbered dependency type folders                               |
| `git diff --check`                                                       | Passed                                                                                               |
| `git fsck --full`                                                        | No corrupt objects; only a benign unreferenced empty tree                                            |
| Credential scan                                                          | No matches in 127 current files, 142 reachable historical Git blobs, or 26 production browser assets |

The two browser configurations are the same configurations orchestrated sequentially by `npm run test:e2e`. Together they passed 61 checks. The final core verification ran after browser servers exited and generated output was removed. No paid AI calls, real email messages, hosted schema changes or deployments were made.

## What the new tests establish

- Recommendations do not mutate the collection until accepted; edited daily goals do not change the usual goal. Priority ranking is deterministic, unavailable words are excluded, and started sets cannot be replaced.
- Captures can be saved before any lexical card exists, edited, restored after reload and converted into a personal card with context. Failed card creation does not remove the capture.
- Sessions preserve the question, selected/checked answer, unfinished typing, sentence and confidence. Browser tests resume after reload and midnight. Domain tests verify that completion updates the original daily set and advances the saved checkpoint atomically.
- Reviews adapt to recent skill mistakes while always testing recall before showing the answer. Delayed recall excludes short-gap reviews and confidence-only results; vocabulary usage reflections do not change recall accuracy or award XP.
- Contextual tips are opt-in, individually dismissible and replayable. Desktop and mobile layouts were checked, and recommendation/memory screenshots were inspected.
- Account-mode browser tests simulate a failed state write, retry it, and resume the selected answer in another page using shared account-state fixtures. These tests do not use local demo storage, but the learning-state backend in this browser test remains a fixture.
- Embedded PostgreSQL tests run migration 003 through the real migration runner, test repeat execution, atomic revision handling and owner-only access to private workspace data. Read-path tests verify older paused daily sets and an actionable error when migration 003 is missing.

## Failures corrected during verification

The new recommendation heading made an old account-test heading selector ambiguous; it now identifies the page's level-one heading. A delayed-recall fixture initially completed a lesson before its setup date; the fixture now creates the lesson and then advances time. The new account test initially navigated before sign-in finished; it now waits for the authenticated destination. A read-path fixture was corrected to match the database's nested `data` column response. Initial implementation type/lint issues were corrected without disabling checks. All final runs above passed.

## Deployment and practical limits

Apply `003_vocabulary_practice.sql` using `npm run db:migrate` before deploying this code. It extends existing profile storage and atomic state saves; earlier migrations and existing history are preserved. The migration is prepared and tested locally, but has not been applied to the hosted database in this update.

After deployment, complete the README's real-account, cross-device resume and export checks. Account saving requires connectivity. Drafts autosave after a brief pause and attempt a save when the page is hidden; wait for the saved status before closing. Unsaved input cannot be guaranteed after an abrupt browser/device shutdown. One draft per session kind is retained, and inbox/journal capacity is explicitly limited to 100 entries each. Usage feedback checks word presence and records the user's reflection, not independent semantic or grammar assessment.

---

# Verification — 2026-09-13 maintenance audit

This report records the current maintenance pass. The earlier build had 38 tests; the counts below describe fresh executions, not a reconstruction of the earlier local cleanup.

## Local checks

The final repaired-install run used Node 24.21.0 and npm 11.19.0, with locked Next.js 16.3.5. Earlier checks in this maintenance pass used Node 24.13.1/npm 11.8.0. The project's Node 24 recommendation does not require an identical patch version on every computer.

| Command/check                                                           | Final result                                                                         |
| ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `npm ci`                                                                | Passed; repaired install added 417 packages, zero audited vulnerabilities            |
| `npm run lint`                                                          | Passed                                                                               |
| `npm run typecheck`                                                     | Passed after dependency repair, with generated `.next` output removed                |
| `npm test`                                                              | 95 tests passed across 8 files                                                       |
| `npm run build`                                                         | Passed from clean generated output                                                   |
| `E2E_SCREENSHOTS=true npm run test:e2e`                                 | 44 passed (35 learning/demo + 9 account); 1 intentional duplicate mobile-matrix skip |
| `npm run check:production`                                              | Expected rejection of local HTTP, with explanatory guidance                          |
| `npm run check:production -- --app-url https://lexiloop-ali.vercel.app` | Passed structural configuration checks                                               |

The final `npm run verify` executed lint, typecheck, all 95 unit/route/database tests and build successfully. A dependency-corruption recurrence was actually observed during this pass: eight empty numbered folders such as `node 2` and `react 2` appeared in `node_modules/@types`. A fresh `npm ci` removed them. Their cause was not established; no fake packages or TypeScript workarounds were added. The initial failed clean check is not counted as passing. npm reported an ESLint support/deprecation notice and install-script policy notices; installation, tests and build still completed. No dependency versions or lockfile were changed.

Reproduce the core checks with:

```bash
npm ci
npm run lint
npm run typecheck
npm test
npx playwright install chromium
npm run test:e2e
npm run build
```

`npm run verify` combines lint, typecheck, unit/database tests and build. `npm run test:e2e` runs the demo learning suite and then the account fixture suite, each on its own controlled local server. It does not use real Supabase accounts, Gmail or OpenAI credentials. Optional screenshot captures are enabled by `E2E_SCREENSHOTS=true`; the only other intentional skip is a duplicate phone-width matrix already exercised by the desktop project.

## Coverage and limits

- Unit/route tests cover successful and invalid signup/signin, duplicate/unconfirmed-account guidance, logout, recovery, password changes, callback verification, unsafe redirects, exact-origin protection and unauthenticated APIs.
- OpenAI tests use real SDK error classes with mocked network responses. They cover structured success, configured/default models, parse/schema/semantic validation retries, invalid credentials, permission denial, rate limits, billing quota, timeout/network failure, unavailable models, generic upstream errors, safe logging and `store: false`.
- Word-route tests cover starter/cache reuse, aliases, cache recheck after lease acquisition, quota ownership from the verified user, busy leases, provider failure cleanup, canonical persistence and safe storage errors.
- Database tests execute the actual migration runner and both SQL migrations in embedded PostgreSQL with simulated Supabase Auth roles. They verify ledger idempotency, rollback, repeatable seed data, RLS ownership, denied client writes/privileged functions, daily data, revision conflicts, review events, progress aggregation, profile trigger, quotas, aliases and lease expiry/release rules. The advisory lock is a stand-in in the single-process embedded engine; production uses PostgreSQL advisory locks.
- Browser tests exercise full mixed personal/suggested learning and due review, persistence in demo storage, word management/export, errors, long notes, desktop/phone layout, 320/375/390/393/414/430/768/1440px ring bounds, navigation, dark/reduced-motion settings, PWA assets and cold offline fallback.
- Account browser tests exercise actual Next.js auth routes and SSR cookies against a local Auth fixture, plus intercepted UI response states. They cover protected redirects, login, sign-out network failure/retry, recovery, expired links, changing a password and signing in with the new password, labels and keyboard focus at desktop/tablet/mobile sizes. Learning-state replies in these account tests are fixtures, not proof of hosted persistence.

## Read-only live evidence

- GitHub HEAD matched local starting commit `7d9f8d8175449c1b10ddc2454e834b4c6317ff30`.
- GitHub Actions run `34718739654` for that existing commit completed successfully. This is not CI evidence for unpushed maintenance edits.
- The production root returned HTTP 307 to `/login`; unauthenticated `/api/state` returned 401, no private state and `Cache-Control: no-store`.
- A read-only transaction against the configured Supabase database found both migration ledger entries, all 14 public app tables with RLS enabled, 20 stored lessons, 20 meanings and 40 examples. Inspected policies matched owner-only private reads and authenticated shared-content reads.
- Local configuration presence/modes were checked without printing values: real accounts, local HTTP origin and OpenAI/model selection matched the intended setup. No duplicate entries were found.

## Security checks

The final scan found no matches across 116 current files, all 106 reachable historical Git blobs and 25 production browser assets, checked for the actual nonempty local server credentials and credential-like patterns. `.env.local` is ignored and untracked. Provider modules keep server-only boundaries; automated fixtures use dummy credentials. Scan results establish no matches within the inspected files, not a guarantee about unrelated provider logs or inaccessible external history.

## Still requires hosted acceptance

Follow the README checklist for real signup and Gmail confirmation delivery, recovery email and reset links, cross-device persistence, second-account privacy, paid generation with the configured model and cache reuse. These are not implied by a successful build, fixture tests or read-only database inspection. No paid smoke request or deliberate credit exhaustion was performed. Actual Gmail dashboard settings, OpenAI billing/model permissions, backup restoration and physical iPhone/Safari behavior require separate verification.

## Optional tutorial update — 2026-09-13

Added opt-in page guides for all eight main app sections, a browser-local Learning tips switch in Settings, step navigation and goal/control explanations. The initial invitation can be declined; enabled guides can be hidden, replayed or disabled. No database migration or AI request is required.

Validation: `npm run verify` passed lint, TypeScript, all 95 unit/route/database tests and a production build. The full browser run passed 39 learning/demo/tutorial checks and 9 account checks, with one intentional duplicate mobile check skipped. A final targeted tutorial run passed all 6 desktop/mobile checks, including two additional blocked-storage/dark-appearance checks (50 distinct passing browser checks across the runs). Lint was repeated after the final content/test edits. Desktop, phone and dark guide screenshots were inspected; 320px width, keyboard switching, page-specific content, persistence, decline and replay were tested. The first sandboxed browser launch could not bind the local test port; the permitted retry passed. These edits remain local and have not been deployed.
