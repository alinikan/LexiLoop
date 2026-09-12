# Verification — 2026-09-12

Final source was checked with Node 24.13.1, Next.js 16.3.5, TypeScript 5.9.3 and the committed npm lockfile.

| Check                                                 | Result                                                                                                                            |
| ----------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Clean `npm ci`                                        | Passed: 418 packages installed; npm audit reported zero vulnerabilities                                                           |
| ESLint                                                | Passed without errors or warnings                                                                                                 |
| TypeScript strict check                               | Passed                                                                                                                            |
| Unit/provider/auth-route/embedded-PostgreSQL tests    | **38 passed** across five files                                                                                                   |
| Full learning/layout/PWA browser run with screenshots | **33 passed**, 3 skipped at that run: two live-account cases and one duplicate mobile matrix                                      |
| Separate account-mode form browser run                | **2 passed**, using intercepted API fixtures; no real signup/email                                                                |
| Final optimized production build                      | Passed; private routes remain dynamic/protected                                                                                   |
| Production HTTP smoke                                 | Home/collection/reset redirect to login; private APIs return no data; legacy demo flags do not enable demo; PWA assets return 200 |
| Screenshot inspection                                 | Desktop Today, mobile Today and 320px account-confirmation form inspected                                                         |
| Viewport matrix                                       | Ring at 320/375/390/393/414/430/768/1440px; navigation/forms at all six phone widths; dark and reduced-motion preferences         |

The 33-test browser count includes two screenshot captures. The subsequently added account-mode suite is run separately, so a normal complete test invocation skips it unless `E2E_AUTH_UI=true`. A default run also skips optional screenshots and live-account tests. These skips do not assert that external services were verified.

## Covered behavior

The complete mixed-day journey selects three personal words and two suggestions, finishes every learning phase, reloads to verify five durable completions in demo storage, advances the browser clock until reviews are due, answers incorrectly, completes a review, reloads and verifies the shorter interval. Other journeys cover full-slot limits, replacement, locking, duplicate guidance, suggestions, settings, collection persistence, correct/incorrect feedback and typed exercise variation.

PostgreSQL tests execute both real migrations, seed canonical content, verify normalized examples, reject stale revisions, enforce RLS ownership, deny ordinary client writes/privileged functions, enforce quotas, initialize profile preferences, isolate progress summaries, serialize generation leases and preserve canonical aliases. The embedded database simulates Supabase Auth's roles/identity function; it does not substitute for a hosted Supabase test.

Route tests verify origin rejection, generic recovery responses, unauthorized reset rejection, password updates for a verified identity, token verification, fixed internal redirects, expired-link guidance and no exposure of unexpected upstream details. Provider tests verify production mock guards, structured-output retry, Cambridge licensing fallback/status failures, malformed URLs and pronunciation-independent entry display.

The account UI browser run uses a production build with clearly fake public Supabase identifiers and intercepted `/api/auth` replies. It tests password mismatch, show/hide, confirmation state, incorrect credentials, reset-email feedback and 320px layout. That fixture build was replaced by the final build afterward.

## Not claimed as tested

No real user-owned Supabase project, email sender, OpenAI API billing key, Cambridge development agreement/key, GitHub remote or Vercel deployment was provided. Live signup/email confirmation/recovery, hosted cross-device persistence, paid generation, actual Cambridge dataset/branding/audio rights, backup restoration and physical-iPhone installation remain the operator's acceptance checklist in the README. Browser iPhone emulation here uses Chromium, not an actual iPhone/Safari device.

No private HTML or API data is service-worker cached. Offline writes are not queued or falsely marked saved. Reminders are in-app; there is no scheduled push service.

## Reproduce

```bash
npm ci
npm run lint
npm run typecheck
npm test
npx playwright install chromium
npm run test:e2e
npm run build
```

For screenshots, set `E2E_SCREENSHOTS=true`. For an existing test server, set `E2E_BASE_URL` to its origin. The fixture auth suite requires `E2E_AUTH_UI=true` and an account-mode build with public Supabase configuration; run `npx playwright test tests/e2e/auth-ui.spec.ts` against it. Real email-signin cases require `E2E_EMAIL`, `E2E_PASSWORD`, and `NEXT_PUBLIC_DEMO_MODE=false`, pointing to a configured account server. Use disposable accounts and keep those secrets out of source control.

The clean ZIP is checked for CRC integrity and byte equality with included source files when packaged. Environment files, dependencies, build output, test traces and local learner data are excluded.
