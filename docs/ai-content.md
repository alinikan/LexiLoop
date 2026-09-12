# Lexical generation and dictionary references

## Original content

`WordProvider.generate(word)` returns a validated `Word`. The input contains no account ID, notes or personal sentences. The starter catalog is original editorial curriculum; it is not Cambridge data or fake user progress.

The authenticated POST route validates and normalizes the word, checks editorial/canonical content and aliases, acquires a 90-second generation lease, rechecks the cache, consumes the durable 20-attempt UTC-day allowance and invokes OpenAI. Cache hits do not call OpenAI. A duplicate in-progress input gets a retry response. Failed attempts count toward quota.

OpenAI uses `responses.parse`, the Zod structured-output format, `store:false`, a 35-second per-attempt timeout and no implicit SDK retries. Structured parsing and semantic validation receive up to two attempts total. Authentication/permission/rate errors do not trigger a fallback. Successful content and aliases are persisted through a service-only transaction.

Validation requires meanings, examples, scenario, practical guidance, register, sensitivity, distinctions, collocations, family/patterns, memory hook and four exercise categories, and checks answer indices. It cannot guarantee factual/lexical truth. Users inspect a generated preview before saving; only then is a private user-word association created. Notes and schedules never become canonical content.

## Cambridge

`lib/dictionary` defines a separate provider, schema and result contract. The optional API calls only official Cambridge endpoints with a server-side `accessKey` header. Default fallback is an ordinary external source link. Activation requires the API key, licensed dictionary code and operator-confirmed rights. Audio has a separate flag.

The first matching entry is rendered unmodified in an isolated script-disabled frame. Additional entries are accessible through the source website. Definitions, examples, labels and IPA appear only when supplied. Missing audio never removes a valid entry. API status failures, malformed entries and unavailable pronunciation have graceful fallbacks. Invalid external canonical URLs are rejected.

Cambridge content is transient: no database, local-storage, export, service-worker or AI reuse. Both network requests and route responses use `no-store`; audio does not preload. Actual attribution/branding and playback rights must be reviewed against the operator's signed agreement before activation. The README supplies the current registration/licensing steps.

## Development

`npm run dev:demo` explicitly selects the device demo. The mock provider only supplies the original starter lessons and cannot generate arbitrary words. Both demo and mock selection are disabled by `NODE_ENV=production`. Missing production AI configuration fails clearly; it never substitutes a mock response.

Sources: [OpenAI structured outputs](https://developers.openai.com/api/docs/guides/structured-outputs), [Cambridge specification](https://dictionary-api.cambridge.org/api/specification), [Cambridge FAQ](https://dictionary-api.cambridge.org/api/faq), [Cambridge terms](https://dictionary-api.cambridge.org/api/terms-and-conditions). Setup details and license limitations are in the README.
