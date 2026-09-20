# Repository maintenance audit — 2026-09-13

This audit updates the existing repository and deployment documentation. The starting local commit and GitHub HEAD were both `7d9f8d8175449c1b10ddc2454e834b4c6317ff30`. The checkout was clean before changes. Next.js/Supabase, real accounts, Gmail SMTP for private use and configurable OpenAI generation remain the architecture.

## Changes and decisions

| Area                 | Finding and correction                                                                                                                                                                                                 |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| README               | Replaced archive/new-repository setup and historical audit language with cloning, macOS/Windows Node installation, real-account configuration, Gmail SMTP, existing Vercel deployment and operational troubleshooting. |
| OpenAI               | Replaced the old `gpt-4.1-mini` fallback/example with the requested `gpt-5.6-terra`. Responses API, structured validation, `store: false`, 35-second requests and no SDK retries remain.                               |
| Error handling       | Added typed safe categories for provider failures. Only malformed lesson/JSON output receives a second attempt; infrastructure/configuration errors no longer blame word spelling. Logs contain a fixed category only. |
| Quota/storage errors | Database failures checking a lease/quota now report unavailable storage/limits rather than falsely claiming another request owns the lease or the daily allowance is exhausted.                                        |
| Production checker   | Added duplicate-variable detection, base-origin validation and a cross-platform `--app-url` override. HTTPS remains mandatory; localhost rejection explains that local development is valid.                           |
| Migration runner     | Extracted the existing algorithm for direct testing; moved lock acquisition before ledger creation and explicitly releases the lock. No schema change or production migration is required.                             |
| Account tests        | Normal browser verification now includes isolated account-mode tests. Local Auth fixtures exercise actual Next.js auth routes, session cookies, protected pages, recovery and password changes without real email.     |
| UI                   | Sign-out network failures display guidance; lesson progress has an accessible name; collection mastery labels now use the same interval/confidence rule as Progress.                                                   |
| CI                   | Keeps Node 24 and clean npm installation, checks TypeScript explicitly before the build, and runs both isolated browser suites. Removed reliance on demo flags for the production build.                               |

## Important distinctions

`SUPABASE_SECRET_KEY` was already correct; no old environment alias was reintroduced. The real local file already selected localhost, real accounts, OpenAI and `gpt-5.6-terra`. It was not rewritten.

SiteURL-based confirmation templates always return to the project's Site URL. The README instead documents RedirectTo-based links matching the exact signup/recovery URLs supplied by the code, so a shared Supabase project can return local requests locally. Existing SiteURL templates are explained as a valid production-only destination choice. Dashboard templates were not changed by these repository edits.

The previous dependency-corruption incident is documented as troubleshooting. Numbered empty type folders recurred during final verification; a fresh locked install repaired them and the clean verification sequence was rerun. The process that created them was not established. No fake type packages were added, TypeScript checks were not disabled, and the lockfile was preserved. Fresh verification results are in [verification.md](verification.md); historical claims about missing repositories/accounts are not used to describe today's setup.

## Deployment boundary

The changes are local working-tree changes until committed, pushed and deployed. Read-only production checks observe the existing deployment, not these new changes. The live database was inspected without modifying rows, migrations or policies. Hosted signup/email recovery, paid OpenAI generation and physical iPhone acceptance remain distinct from local fixture tests.
