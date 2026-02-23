# Changelog

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
