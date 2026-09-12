# Production finalization

The existing Next.js/Supabase architecture was retained. The audit preceded implementation. Production guards, account recovery, profile preferences, delta persistence, bounded history, provider reliability, Cambridge isolation, responsive layout fixes, and expanded tests were applied to the existing repository.

The current state and limitations are recorded in `production-audit.md` and `verification.md`. The README is the authoritative beginner setup guide. External account creation, live credential verification, licensing approval and public deployment remain operator actions; local tests do not stand in for them.
