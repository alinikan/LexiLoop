# Maintenance direction

LexiLoop already has a GitHub repository and Vercel deployment. Keep the Next.js/Supabase architecture, real accounts, Gmail SMTP for private use and configurable OpenAI generation. Cambridge remains optional.

The [README](../README.md) is the setup guide. [Architecture](architecture.md) explains implementation invariants. [Production audit](production-audit.md) records the current maintenance changes, and [verification](verification.md) separates local evidence from hosted-service acceptance checks.

Future schema changes should use forward migrations. Before adding services or changing architecture, identify the concrete user need; the current target is a small private vocabulary app.
