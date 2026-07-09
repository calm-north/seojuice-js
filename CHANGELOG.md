# Changelog

## 1.4.1

### Security
- **JSON-LD is now escaped before `<script>` injection.** `replaceMetaTags` escapes every `<` in the serialized structured data as `<`, so a `</script>` in any API-supplied string value can no longer break out of the `application/ld+json` tag. This neutralizes a stored-XSS vector regardless of upstream trust; output stays valid JSON-LD (round-trips identically).

### Fixed
- **Transport and timeout failures now enter the typed error hierarchy.** A dead endpoint throws `NetworkError` (`code: "network_error"`) and a hung request throws `TimeoutError` (`code: "timeout"`), both `extends SEOJuiceError` with `status: 0` — the documented `code`/`status`/`requestId` contract now holds on network/timeout paths, not just HTTP error responses.
- **`verifyWebhookSignature` honors its "never throws" contract** — a null/undefined/non-string `secret` or `body` (e.g. a `rawBody` already consumed by a body-parser) returns `false` instead of throwing a raw `TypeError`.
- **`new SEOJuice({ apiKey: "" })` and `new SEOJuice()` fail fast** with a clear `SEOJuiceError("apiKey is required")` instead of deferring to a 401 or throwing a cryptic destructuring error.
- **`seojuice/next` loads under bare Node ESM** — imports `next/server.js` by file path (`next` ships no exports map), fixing `ERR_MODULE_NOT_FOUND` on edge/Deno/unit-test usage.

### Added
- **Opt-in `maxRetries`** on the client with exponential-jitter backoff that honors `Retry-After` on idempotent (GET) requests. Off by default (`maxRetries: 0`).

### Examples & docs
- Fixed `intelligence-api` field drift (`total_pages` / `seo_score`), renamed the two JSX examples to `.tsx`, and added an `examples/tsconfig.json` `tsc --noEmit` gate so example rot and README↔code drift fail CI.
- Guarded optional `seo.suggestions?.length` in the App Router example and README.
- `examples/` is now shipped in the npm tarball.

## 1.4.0

### Added
- **`verifyWebhookSignature(secret, body, signature)`** — HMAC-SHA256 webhook signature verification, exported from the top-level package. Constant-time comparison, never throws on a malformed/length-mismatched signature. Parity with the Python SDK's `verify_webhook_signature`.

### Docs
- Documented the Next.js 16+ `proxy.ts` convention (`middleware.ts` → `proxy.ts`, `export const middleware` → `export const proxy`) for `createSeoMiddleware`. Next.js 13–15 still use `middleware.ts` / `middleware` — same handler either way.

## 1.3.0

### Fixed
- **structured_data now injects as valid JSON-LD against the live payload.** The `/suggestions` API single-encodes `structured_data` (`json.dumps` once); the previous double-`JSON.parse` threw and silently dropped the schema. Now decodes single- or double-encoded defensively. (Supersedes the 1.2.0 note that described double-decoding as intentional.)
- **CJK internal links at sentence end.** The `isAsian` link boundary now allows full-width Japanese punctuation (`。、！？）」』`), so a keyword ending a sentence (e.g. `投資信託。`) is linked.
- **Content diffs on hydrated pages.** `applyContentDiffs` now ignores `<script>`/`<style>` regions when detecting ambiguous duplicates, so pages that serialize the original text into a hydration script (e.g. Next.js App Router `__next_f`) no longer skip the visible-body diff.

### Security & robustness
- **`applyBrokenLinkFixes` rewritten from a quadratic-backtracking regex to a linear tokenizer** — a ~2 MB page went from ~3 s of blocked event loop to under 10 ms.
- **`createSeoMiddleware` fails open on any origin error** — a fetch/read failure returns the original response instead of a 500, and its origin self-fetch is re-entrancy-guarded.
- **`injectSEO` / `injectResponse` never throw** — null/undefined/non-string input returns a string.
- **Response bodies are size-capped** (suggestions 5 MB, HTML 10 MB) to prevent OOM on a hostile upstream.

### Added
- **`ChangeType` / `ChangeRecord` type completeness** — `ChangeType` gains `H1Tag` and `BrokenLinkFix`; `ChangeRecord` gains `risk_level`, `batch_id`, `batch_label`, `edited_manually` — matching the live API's change schema.

## 1.2.0

### Added — full server-side injection parity

`injectSEO` now performs complete server-side injection matching the SEOJuice edge Worker: internal links (real `<a>` in the body), image alt-text, content diffs, h1 replacement, broken-link fixes, a manifest comment, and the `window.seojuiceSSR` flag. Fails open (returns original HTML) on any error.

- `validateApiResponse` (C1) gates the content-mutating transforms against malformed/actionless payloads — the manifest comment and SSR flag still land unconditionally, matching the Worker's own behavior.
- Content-area targeting (C2): `insert_into_content_only` restricts internal-link injection to block-content elements (`p`, `li`, `span`, `div`, `td`, `blockquote`, `dd`, `figcaption`), never headings/nav/footer chrome.
- New first-class `seojuice/next` adapter: `createSeoMiddleware()` (origin-fetch pattern) and `injectResponse()`, the framework-agnostic core. Optional fire-and-forget `/views` beacon (C3) for JS-less AI crawler analytics.
- `next` added as an optional peer dependency (types only) — zero runtime dependencies are preserved; `next/server` is never bundled.

### Changed (output-visible)

- Internal links are now injected as real `<a>` elements in the body instead of a `<script type="application/json" id="seojuice-links">` blob. On server-rendered routes, drop the client snippet to avoid redundant re-processing (`data-seojuice-cs` markers keep it idempotent if you don't).
- Existing `<head>` tags (title/meta/OG) are now respected — no duplicate injection.
- `structured_data` is double-decoded into valid JSON-LD.
- Attribute escaping now emits `&#039;` (was `&#39;`).
- Injected nodes carry `data-seojuice*` markers; a `<!-- seojuice: … -->` manifest is appended.

### Fixed

- `SuggestionLink` type now includes `id` (used for change-set markers).
- Broken-link fixes now read `new_url || replacement_url`, so legacy-shape fixes (where only `replacement_url` is populated) are applied instead of silently skipped.

## 1.1.0 (2026-03-10)

### Features

- New `changes` resource with full lifecycle management: `list()`, `get()`, `approve()`, `reject()`, `revert()`, `pull()`, `verify()`, `bulk()`, `stats()`, `settings()`, `updateSettings()`
- Headless CMS pull/verify workflow: mark changes as pulled by your integration, then verify after deploy
- Bulk actions support (approve, reject, revert, pull, verify) with up to 500 IDs per request
- Automation settings management (modes per change type, daily budgets, path exclusions)
- Webhook payload types (`ChangeWebhookPayload`) for handling change lifecycle events
- New enums: `ChangeStatus`, `ChangeType`, `AutomationMode`
- 11 integration examples: Next.js SSG, Contentful, Sanity, React dashboard, Remix, Astro, Gatsby, WordPress headless, webhook receiver, headless CMS sync, change management
- URL-based filtering on changes list (`url` parameter)

### Breaking Changes

- Removed `RiskLevel` enum and `risk_level` field from `ChangeRecord` — risk level is no longer part of the changes API
- Removed `by_risk` from `ChangeStats`
- Removed `risk_level` from `ChangeListParams` filter options
- `ChangeRecord` type moved from `types/content` to `types/changes` (re-exported from package root, so imports from `"seojuice"` still work)

## 1.0.1 (2026-02-23)

### Bug Fixes

- Fix error message extraction to read backend `message`/`error` fields instead of `detail`
- Fix `ReportDetail.summary` type from `Record<string, unknown>` to `string` to match backend

## 1.0.0 (2026-02-23)

Initial commit.

### Features

- Full typed client for the SEOJuice Intelligence API (v2)
- 15 resource namespaces: websites, pages, links, intelligence, clusters, content, competitors, aiso, keywords, backlinks, accessibility, reports, analysis, similar, gbp
- Automatic pagination with `autoPaginate()` async generator
- Typed error hierarchy: `AuthenticationError`, `NotFoundError`, `RateLimitError`, `APIError`
- Input validation on all resource methods (domain, ID params)
- SEO injection helpers via `seojuice/injection` subpath export
- `fetchSuggestions()` for fetching SEO data from smart.seojuice.io
- `injectSEO()` for server-side HTML transformation with XSS-safe output
- Dual ESM/CJS build with full TypeScript declarations
- Zero runtime dependencies
- Works in Node.js 18+, Deno, Bun, Cloudflare Workers, and edge runtimes
