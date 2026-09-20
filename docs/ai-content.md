# Lexical generation and external references

## Original content

`WordProvider.generate(word)` returns a validated `Word`. The input contains no account ID, notes or personal sentences. The starter catalog is original editorial curriculum; it is not Cambridge data or fake user progress.

The authenticated POST route validates and normalizes the word, checks editorial/canonical content and aliases, acquires a 90-second generation lease, rechecks the cache, consumes the durable 20-attempt UTC-day allowance and invokes OpenAI. Cache hits do not call OpenAI. A duplicate in-progress input gets a retry response. Failed attempts count toward quota.

The default model is `gpt-5.6-terra`; `OPENAI_MODEL` can explicitly override it. OpenAI uses `responses.parse`, the Zod structured-output format, `store:false`, a 35-second per-attempt timeout and no implicit SDK retries. Structured parsing and semantic validation receive up to two attempts total. Only malformed structured/lesson output is retried. Billing quota, rate limits, authentication, permissions, model errors, timeouts and connection failures produce a safe provider-unavailable message without retry. Logs contain only a fixed failure category. SDK `insufficient_quota` code/type distinguishes billing quota from other HTTP 429 errors; unknown codes are not inferred from private message text. Successful content and aliases are persisted through a service-only transaction.

Validation requires meanings, examples, scenario, practical guidance, register, sensitivity, distinctions, collocations, family/patterns, memory hook and four exercise categories, and checks answer indices. It cannot guarantee factual/lexical truth. Users inspect a generated preview before saving; only then is a private user-word association created. Notes and schedules never become canonical content.

## External dictionary link

Word cards provide a normal link to the public Cambridge Dictionary page for the word. There is no dictionary provider, API route, key, embedded dictionary content, or dictionary audio in LexiLoop. Following the link leaves the app and lets the browser load Cambridge's website directly.

## Development

`npm run dev:demo` explicitly selects the device demo. The mock provider only supplies the original starter lessons and cannot generate arbitrary words. Both demo and mock selection are disabled by `NODE_ENV=production`. Missing production AI configuration fails clearly; it never substitutes a mock response.

Source: [OpenAI structured outputs](https://developers.openai.com/api/docs/guides/structured-outputs). Setup details are in the README.
