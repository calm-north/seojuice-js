# Changelog

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
