# seojuice

Official Node.js SDK for [SEOJuice](https://seojuice.com) — Intelligence API client and server-side SEO injection.

```bash
npm install seojuice
```

**Zero runtime dependencies** | Node.js 18+ | Deno | Bun | Cloudflare Workers

## Table of Contents

- [Quick Start](#quick-start)
- [Configuration](#configuration)
- [API Reference](#api-reference)
  - [Changes](#changes)
  - [Webhooks](#webhooks)
- [Pagination](#pagination)
- [Error Handling](#error-handling)
- [SEO Injection (Server-Side)](#seo-injection-server-side)
- [Caching Strategies](#caching-strategies)
- [Framework Integrations](#framework-integrations)
  - [Next.js (native adapter)](#nextjs-native-adapter)
- [Headless CMS Integrations](#headless-cms-integrations)
- [Edge Runtime / Cloudflare Workers](#edge-runtime--cloudflare-workers)
- [TypeScript](#typescript)
- [Security](#security)
- [License](#license)

## Quick Start

### Intelligence API

```typescript
import { SEOJuice } from "seojuice";

const client = new SEOJuice({ apiKey: process.env.SEOJUICE_API_KEY! });

// List your websites
const websites = await client.websites.list();

// Get SEO intelligence summary
const summary = await client.intelligence.getSummary("example.com", {
  period: "30d",
  include_trends: true,
});

// Iterate all pages with automatic pagination
import { autoPaginate } from "seojuice";

for await (const page of autoPaginate((params) =>
  client.pages.list("example.com", params),
)) {
  console.log(page.url, page.health_score);
}
```

### SEO Injection

Fetch SEO data and inject internal links, meta tags, Open Graph tags, and structured data into server-rendered HTML:

```typescript
import { fetchSuggestions, injectSEO } from "seojuice/injection";

const suggestions = await fetchSuggestions("https://example.com/blog/my-post");

const html = injectSEO({
  html: originalHtml,
  suggestions,
});
```

## Configuration

```typescript
import { SEOJuice } from "seojuice";

const client = new SEOJuice({
  apiKey: "sk_...",           // Required — your API key
  baseURL: "https://...",     // Default: https://seojuice.com/api/v2
  timeout: 30_000,            // Default: 30s (milliseconds)
  fetch: customFetch,         // Custom fetch implementation
  maxRetries: 0,              // Default: 0 (off) — see Retries below
});
```

`apiKey` is required. An empty or missing key throws `SEOJuiceError("apiKey is required")` from the constructor, not a 401 later or a cryptic destructuring error.

Never hardcode API keys. Use environment variables (`process.env.SEOJUICE_API_KEY`) or a secret manager.

## API Reference

All methods return typed responses. The client provides 16 resource namespaces:

| Resource | Methods | Description |
|---|---|---|
| `websites` | `list()` `get(domain)` | Website listing and details |
| `pages` | `list()` `get()` `listKeywords()` `listSearchStats()` `listMetricsHistory()` | Page-level SEO data |
| `links` | `list()` | Internal and external links |
| `intelligence` | `getSummary()` `getTopology()` `getPageSpeed()` | SEO intelligence and performance |
| `clusters` | `list()` `get()` | Topic clusters |
| `content` | `listGaps()` `listDecayAlerts()` `listChanges()` | Content analysis |
| `changes` | `list()` `get()` `approve()` `reject()` `revert()` `pull()` `verify()` `bulk()` `stats()` `settings()` `updateSettings()` | SEO change lifecycle management |
| `competitors` | `list()` | Competitor tracking |
| `aiso` | `get()` | AI Search Optimization scores |
| `keywords` | `list()` | Keyword tracking |
| `backlinks` | `list()` `listDomains()` | Backlinks and referring domains |
| `similar` | `find()` | Similar page discovery |
| `accessibility` | `list()` | WCAG accessibility issues |
| `reports` | `list()` `get()` `create()` `downloadPdf()` | Report generation |
| `analysis` | `start()` `getStatus()` `waitForCompletion()` | On-demand page analysis |
| `gbp` | `listLocations()` `listReviews()` `replyToReview()` | Google Business Profile |

### Websites

```typescript
const websites = await client.websites.list();
const website = await client.websites.get("example.com");
```

### Pages

```typescript
const pages = await client.pages.list("example.com", { page: 1, page_size: 50 });
const page = await client.pages.get("example.com", pageId);
const keywords = await client.pages.listKeywords("example.com", pageId);
const stats = await client.pages.listSearchStats("example.com", pageId, {
  period: "30d",
});
const metrics = await client.pages.listMetricsHistory("example.com", pageId, {
  period: "90d",
});
```

### Intelligence

```typescript
const summary = await client.intelligence.getSummary("example.com", {
  period: "30d",
  include_trends: true,
  include_history: true,
});

const topology = await client.intelligence.getTopology("example.com");

const speed = await client.intelligence.getPageSpeed("example.com", {
  url: "https://example.com/page",
});
```

### Content

```typescript
const gaps = await client.content.listGaps("example.com", {
  category: "blog",
  intent: "informational",
});

const decaying = await client.content.listDecayAlerts("example.com", {
  is_active: true,
  severity: "high",
});

const changes = await client.content.listChanges("example.com", {
  status: "pending",
});
```

### Analysis (Async)

```typescript
const request = await client.analysis.start("example.com", "https://example.com/page");
const result = await client.analysis.waitForCompletion(
  "example.com",
  request.id,
  2000,   // poll interval (ms)
  60_000, // timeout (ms)
);
```

### Reports

```typescript
const reports = await client.reports.list("example.com");
const report = await client.reports.get("example.com", reportId);
const created = await client.reports.create("example.com", { type: "full" });
const pdf = await client.reports.downloadPdf("example.com", reportId);
```

### Google Business Profile

```typescript
const locations = await client.gbp.listLocations("example.com");
const reviews = await client.gbp.listReviews("example.com", {
  needs_attention: true,
  sentiment: "negative",
});
await client.gbp.replyToReview("example.com", reviewId, "Thank you!");
```

### Changes

Manage SEO changes through their full lifecycle: review, approve, deploy, and verify.

```typescript
// List pending changes
const pending = await client.changes.list("example.com", { status: "pending" });

// Filter by page URL
const pageChanges = await client.changes.list("example.com", {
  url: "https://example.com/blog/my-post",
});

// Get a single change
const change = await client.changes.get("example.com", changeId);

// Approve / reject / revert
await client.changes.approve("example.com", changeId);
await client.changes.reject("example.com", changeId, { reason: "Not relevant" });
await client.changes.revert("example.com", changeId, { reason: "Caused issues" });

// Headless CMS pull/verify workflow
await client.changes.pull("example.com", changeId, { integration: "contentful" });
await client.changes.verify("example.com", changeId, { integration: "contentful" });

// Bulk actions (max 500 IDs per request)
const result = await client.changes.bulk("example.com", {
  action: "approve",
  ids: [1, 2, 3],
});
console.log(result.total_succeeded, result.total_failed);

// Stats overview (single aggregated query)
const stats = await client.changes.stats("example.com");
console.log(stats.by_status, stats.by_type);

// Automation settings
const settings = await client.changes.settings("example.com");
await client.changes.updateSettings("example.com", {
  internal_links_mode: "auto_deploy",
  max_changes_per_day: 50,
});
```

### Webhooks

SEOJuice sends webhook events when changes transition states. Verify signatures with `verifyWebhookSignature` (HMAC-SHA256, constant-time, never throws):

```typescript
import { verifyWebhookSignature } from "seojuice";

// In your webhook handler:
const sig = req.headers["x-seojuice-signature"];
if (!verifyWebhookSignature(process.env.SEOJUICE_WEBHOOK_SECRET!, rawBody, sig)) {
  return res.status(401).json({ error: "Invalid signature" });
}

const payload = JSON.parse(rawBody);
// payload.event: "change.created" | "change.approved" | "change.applied"
//              | "change.pulled" | "change.verified" | "change.reverted" | "change.rejected"
// payload.change: full ChangeRecord object
// payload.website: { domain: string }
```

See `examples/changes-webhook-receiver.ts` for a complete Express.js handler.

## Pagination

All list endpoints return `{ pagination, results }`:

```typescript
const result = await client.pages.list("example.com", { page: 1, page_size: 25 });
console.log(result.pagination.total_count);
console.log(result.pagination.total_pages);
console.log(result.results);
```

### PaginatedResponse wrapper

```typescript
import { PaginatedResponse } from "seojuice";

const response = new PaginatedResponse(result);
response.hasNextPage;   // boolean
response.totalCount;    // number
response.currentPage;   // number
```

### Automatic pagination

```typescript
import { autoPaginate } from "seojuice";

for await (const page of autoPaginate(
  (params) => client.pages.list("example.com", params),
  { page_size: 50 },
)) {
  // Yields every item across all pages
}
```

## Error Handling

```typescript
import {
  AuthenticationError,
  NotFoundError,
  RateLimitError,
  APIError,
  NetworkError,
  TimeoutError,
} from "seojuice";

try {
  await client.websites.get("example.com");
} catch (error) {
  if (error instanceof AuthenticationError) {
    // 401 — invalid or expired API key
  } else if (error instanceof NotFoundError) {
    console.log(error.resource); // the requested path
  } else if (error instanceof RateLimitError) {
    console.log(error.retryAfter); // seconds to wait (or null)
  } else if (error instanceof NetworkError) {
    // DNS failure, ECONNREFUSED, dropped connection — status 0
  } else if (error instanceof TimeoutError) {
    // request exceeded the client timeout — status 0
  } else if (error instanceof APIError) {
    console.log(error.status, error.body);
  }
}
```

All errors extend `SEOJuiceError` and include `code`, `status`, and `requestId`. Network failures surface as `NetworkError` (`code: "network_error"`) and timeouts as `TimeoutError` (`code: "timeout"`) — both `status: 0`, since no HTTP response was received.

### Retries

Retries are off by default. Opt in with `maxRetries` on the client:

```typescript
const client = new SEOJuice({ apiKey: "...", maxRetries: 2 });
```

Retries apply only to idempotent GET requests, and only for `RateLimitError` (429) and `NetworkError` — never for 401/404/other 4xx responses. A `Retry-After` header is honored when present; otherwise the SDK backs off exponentially with jitter.

## SEO Injection (Server-Side)

The `seojuice/injection` subpath export provides two functions for server-side SEO enhancement:

### `fetchSuggestions(url, options?)`

Fetches SEO suggestions (internal links, meta tags, structured data) from the SEOJuice smart endpoint.

```typescript
import { fetchSuggestions } from "seojuice/injection";

const suggestions = await fetchSuggestions("https://example.com/blog/my-post", {
  timeout: 5000,     // Default: 10s
  fetch: customFetch, // Optional custom fetch
});
```

### `injectSEO(options)`

Transforms HTML: meta/OG tags and JSON-LD in `<head>`, internal links as real `<a>` elements in the body, image alt-text, content diffs, h1, and broken-link fixes. Fails open — returns the original HTML on any error.

```typescript
import { injectSEO } from "seojuice/injection";

const enhanced = injectSEO({
  html: originalHtml,
  suggestions,
  injectLinks: true,           // internal links as real <a> elements in <body>
  injectMetaTags: true,        // <title>, description, keywords in <head>
  injectOGTags: true,          // og:title, og:description, etc. in <head>
  injectStructuredData: true,  // JSON-LD in <head>
});
```

## Caching Strategies

Always cache SEO suggestions in production. The data changes infrequently (hourly at most) and caching reduces network latency.

### In-Memory Cache

```typescript
import { fetchSuggestions } from "seojuice/injection";
import type { SuggestionResponse } from "seojuice/injection";

const cache = new Map<string, { data: SuggestionResponse; expires: number }>();
const TTL = 3600_000; // 1 hour
const MAX_SIZE = 1000;

async function getCachedSuggestions(url: string): Promise<SuggestionResponse> {
  const now = Date.now();
  const entry = cache.get(url);

  if (entry && entry.expires > now) {
    return entry.data;
  }

  const suggestions = await fetchSuggestions(url);

  // Evict oldest entry if at capacity
  if (cache.size >= MAX_SIZE) {
    const oldest = cache.keys().next().value;
    if (oldest) cache.delete(oldest);
  }

  cache.set(url, { data: suggestions, expires: now + TTL });
  return suggestions;
}
```

### Redis

```typescript
import { createClient } from "redis";
import { fetchSuggestions } from "seojuice/injection";
import type { SuggestionResponse } from "seojuice/injection";

const redis = createClient({ url: process.env.REDIS_URL });
await redis.connect();

async function getCachedSuggestions(url: string): Promise<SuggestionResponse> {
  const key = `seojuice:${url}`;
  const cached = await redis.get(key);

  if (cached) {
    return JSON.parse(cached);
  }

  const suggestions = await fetchSuggestions(url);
  await redis.setEx(key, 3600, JSON.stringify(suggestions));
  return suggestions;
}
```

## Framework Integrations

### Next.js (native adapter)

`seojuice/next` is the recommended path for Next.js — a ready-to-mount
middleware plus the framework-agnostic pieces it's built on. It applies full
server-side injection parity (internal links, alt-text, content diffs, h1,
broken-link fixes), not just `<head>` tags.

```typescript
// proxy.ts (Next.js 16+)
import { createSeoMiddleware } from "seojuice/next";

export const proxy = createSeoMiddleware({ beacon: true });

export const config = {
  matcher: ["/blog/:path*", "/docs/:path*"],
};
```

On Next.js 13–15, name the file `middleware.ts` and export `middleware` instead — same handler.

`createSeoMiddleware(options?)` returns a Next.js middleware/proxy function:

- `options.apiBase` — API origin, defaults to `https://smart.seojuice.io`.
- `options.beacon` — fire-and-forget `/views` beacon (see below). Defaults to `false`.

Standard Next middleware runs *before* the route and cannot read the
rendered page body via `NextResponse.next()`. `createSeoMiddleware` works
around this with the origin-fetch pattern: it re-fetches the request
(`fetch(request)`) to obtain the already-rendered HTML, transforms it, and
returns a new `NextResponse`. This is correct for SSR/static routes at the
cost of a second fetch. It fails open — any origin error (timeout,
non-HTML response, oversized body) returns the original response
untouched, never a 500. For `<head>` tags only, in the App Router, prefer
`generateMetadata` (see [Next.js — App Router](#nextjs--app-router)
below) — it has no double-fetch cost.

If you run a custom server or edge runtime where the rendered HTML is
already in hand, call the underlying primitive directly instead of going
through middleware:

```typescript
import { injectResponse } from "seojuice/injection";

const enhanced = await injectResponse({
  html, // rendered HTML string
  url: request.url,
  apiBase: "https://smart.seojuice.io", // optional
});
```

`injectResponse(opts)` fetches suggestions for `opts.url` and runs
`injectSEO` against `opts.html`. It fails open — any fetch/parse error
returns `opts.html` unchanged, and non-string `html` returns an empty
string rather than throwing. It lives in `seojuice/injection` (not
`seojuice/next`) since it has no Next.js-specific dependency —
`createSeoMiddleware` calls it internally, and any custom server or edge
runtime can call it directly the same way.

`options.beacon: true` on `createSeoMiddleware` (or the standalone
`sendViewBeacon`) reports each request's `url`/`user_agent`/`referrer` to
`/views` server-side, so JS-less AI crawlers (GPTBot, ClaudeBot, …) that
never execute the client snippet still get captured. No cookies or body
are sent, and delivery errors are swallowed — it never blocks or delays
the response:

```typescript
import { sendViewBeacon } from "seojuice/next";

void sendViewBeacon(
  "https://smart.seojuice.io",
  request.url,
  request.headers.get("user-agent") || "",
  request.headers.get("referer") || "",
);
```

See `examples/nextjs-middleware.ts` and `examples/nextjs-app-router.tsx`
for complete, runnable versions of both patterns.

The lower-level `injectSEO`/`fetchSuggestions` primitives from
`seojuice/injection` (used below) still work standalone if you only need
`<head>` tag injection or want to manage caching/fetching yourself.

### Next.js — App Router

```typescript
// app/blog/[slug]/page.tsx
import { fetchSuggestions } from "seojuice/injection";
import { unstable_cache } from "next/cache";

const getSuggestions = unstable_cache(
  async (url: string) => fetchSuggestions(url),
  ["seojuice"],
  { revalidate: 3600 },
);

export async function generateMetadata({ params }: Props) {
  const seo = await getSuggestions(`https://example.com/blog/${params.slug}`);

  return {
    title: seo.title,
    description: seo.meta_description,
    openGraph: {
      title: seo.og_title,
      description: seo.og_description,
      images: seo.og_image ? [seo.og_image] : [],
    },
  };
}

export default async function BlogPost({ params }: Props) {
  const seo = await getSuggestions(`https://example.com/blog/${params.slug}`);

  return (
    <>
      {seo.structured_data && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: seo.structured_data }}
        />
      )}
      {(seo.suggestions?.length ?? 0) > 0 && (
        <script
          type="application/json"
          id="seojuice-links"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(seo.suggestions),
          }}
        />
      )}
      <article>{/* Your content */}</article>
    </>
  );
}
```

### Next.js — Pages Router (SSR)

```typescript
// pages/blog/[slug].tsx
import { fetchSuggestions } from "seojuice/injection";
import type { GetServerSideProps } from "next";

const cache = new Map<string, { data: any; expires: number }>();

export const getServerSideProps: GetServerSideProps = async ({ params, res }) => {
  const url = `https://example.com/blog/${params!.slug}`;
  const now = Date.now();
  let suggestions = cache.get(url);

  if (!suggestions || suggestions.expires <= now) {
    const data = await fetchSuggestions(url);
    suggestions = { data, expires: now + 3600_000 };
    cache.set(url, suggestions);
  }

  res.setHeader("Cache-Control", "s-maxage=3600, stale-while-revalidate=86400");
  return { props: { suggestions: suggestions.data } };
};
```

### Next.js Middleware (HTML Injection, hand-rolled)

For Next.js, prefer `createSeoMiddleware` from
[`seojuice/next`](#nextjs-native-adapter) — it handles the origin-fetch
pattern (`NextResponse.next()` alone cannot read the rendered body),
fails open on origin errors, and applies full injection parity, not just
`<head>` tags. The example below is illustrative of the underlying
fetch/cache shape and works for any framework that gives you a
`Request`/`Response` pair.

```typescript
// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { fetchSuggestions, injectSEO } from "seojuice/injection";

export async function middleware(request: NextRequest) {
  const response = await NextResponse.next();
  const contentType = response.headers.get("content-type") || "";

  if (!contentType.includes("text/html")) return response;

  try {
    const html = await response.text();
    const suggestions = await fetchSuggestions(request.nextUrl.toString());
    const enhanced = injectSEO({ html, suggestions });

    return new NextResponse(enhanced, {
      status: response.status,
      headers: response.headers,
    });
  } catch {
    return response;
  }
}

export const config = {
  matcher: ["/blog/:path*", "/docs/:path*"],
};
```

### Nuxt 3 (Vue)

```typescript
// composables/useSeojuice.ts
import { fetchSuggestions } from "seojuice/injection";
import type { SuggestionResponse } from "seojuice/injection";

export async function useSeojuice(path: string): Promise<SuggestionResponse> {
  const config = useRuntimeConfig();
  const url = `${config.public.siteUrl}${path}`;

  const { data } = await useAsyncData(
    `seojuice-${path}`,
    () => fetchSuggestions(url),
    { server: true },
  );

  return data.value!;
}
```

```vue
<!-- pages/blog/[slug].vue -->
<script setup lang="ts">
const route = useRoute();
const seo = await useSeojuice(`/blog/${route.params.slug}`);

useHead({
  title: seo.title,
  meta: [
    { name: "description", content: seo.meta_description },
    { property: "og:title", content: seo.og_title },
    { property: "og:description", content: seo.og_description },
    { property: "og:image", content: seo.og_image },
  ],
  script: seo.structured_data
    ? [{ type: "application/ld+json", innerHTML: seo.structured_data }]
    : [],
});
</script>
```

### SvelteKit

```typescript
// src/routes/blog/[slug]/+page.server.ts
import { fetchSuggestions } from "seojuice/injection";
import type { PageServerLoad } from "./$types";

const cache = new Map<string, { data: any; expires: number }>();

export const load: PageServerLoad = async ({ params, setHeaders }) => {
  const url = `https://example.com/blog/${params.slug}`;
  const now = Date.now();
  const entry = cache.get(url);

  let suggestions;
  if (entry && entry.expires > now) {
    suggestions = entry.data;
  } else {
    suggestions = await fetchSuggestions(url);
    cache.set(url, { data: suggestions, expires: now + 3600_000 });
  }

  setHeaders({ "Cache-Control": "s-maxage=3600, stale-while-revalidate=86400" });
  return { suggestions };
};
```

### SvelteKit Hooks (HTML Injection)

```typescript
// src/hooks.server.ts
import { fetchSuggestions, injectSEO } from "seojuice/injection";
import type { Handle } from "@sveltejs/kit";

const cache = new Map<string, { data: any; expires: number }>();

export const handle: Handle = async ({ event, resolve }) => {
  const response = await resolve(event);

  if (!response.headers.get("content-type")?.includes("text/html")) {
    return response;
  }

  const url = event.url.toString();
  const now = Date.now();
  const entry = cache.get(url);

  let suggestions;
  if (entry && entry.expires > now) {
    suggestions = entry.data;
  } else {
    try {
      suggestions = await fetchSuggestions(url);
      cache.set(url, { data: suggestions, expires: now + 3600_000 });
    } catch {
      return response;
    }
  }

  const html = await response.text();
  return new Response(injectSEO({ html, suggestions }), {
    status: response.status,
    headers: response.headers,
  });
};
```

### Angular SSR

```typescript
// server.ts — Express middleware for Angular Universal
import { fetchSuggestions, injectSEO } from "seojuice/injection";

const cache = new Map<string, { data: any; expires: number }>();

function seojuiceMiddleware(app: Express) {
  app.use(async (req, res, next) => {
    const originalSend = res.send.bind(res);

    res.send = (body: any) => {
      if (typeof body !== "string" || !body.includes("</html>")) {
        return originalSend(body);
      }

      const url = `${req.protocol}://${req.get("host")}${req.originalUrl}`;
      const now = Date.now();
      const entry = cache.get(url);

      if (entry && entry.expires > now) {
        return originalSend(injectSEO({ html: body, suggestions: entry.data }));
      }

      fetchSuggestions(url)
        .then((suggestions) => {
          cache.set(url, { data: suggestions, expires: now + 3600_000 });
          originalSend(injectSEO({ html: body, suggestions }));
        })
        .catch(() => originalSend(body));

      return res;
    };

    next();
  });
}
```

## Headless CMS Integrations

Use SEOJuice to inject internal links into content from any headless CMS.

### Storyblok

```typescript
// lib/seojuice-storyblok.ts
import { getStoryblokApi, renderRichText } from "@storyblok/react";
import { fetchSuggestions } from "seojuice/injection";
import type { SuggestionResponse, SuggestionLink } from "seojuice/injection";

const cache = new Map<string, { data: SuggestionResponse; expires: number }>();

async function getSuggestions(url: string): Promise<SuggestionResponse> {
  const now = Date.now();
  const entry = cache.get(url);
  if (entry && entry.expires > now) return entry.data;

  const data = await fetchSuggestions(url);
  cache.set(url, { data, expires: now + 3600_000 });
  return data;
}

/**
 * Inject internal links into Storyblok richtext HTML.
 * Call after renderRichText() to add SEOJuice link suggestions.
 */
export function injectLinksIntoHtml(
  html: string,
  links: SuggestionLink[],
): string {
  let result = html;

  for (const link of links) {
    // Match keyword as whole word, not already inside an <a> tag
    const escaped = link.keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const pattern = new RegExp(
      `(?<![<\\/a-zA-Z])\\b(${escaped})\\b(?![^<]*<\\/a>)`,
      "i",
    );
    const href = link.url
      .replace(/&/g, "&amp;")
      .replace(/"/g, "&quot;");
    result = result.replace(pattern, `<a href="${href}">$1</a>`);
  }

  return result;
}

export async function getStoryWithSeo(slug: string, siteUrl: string) {
  const api = getStoryblokApi();
  const { data } = await api.get(`cdn/stories/${slug}`, { version: "published" });

  const seo = await getSuggestions(`${siteUrl}/${slug}`);
  const bodyHtml = renderRichText(data.story.content.body);
  const enrichedHtml = injectLinksIntoHtml(bodyHtml, seo.suggestions);

  return { story: data.story, enrichedHtml, seo };
}
```

### Payload CMS

```typescript
// src/hooks/seojuice-hook.ts
import { fetchSuggestions } from "seojuice/injection";
import type { SuggestionResponse } from "seojuice/injection";
import type { CollectionAfterReadHook } from "payload/types";

const cache = new Map<string, { data: SuggestionResponse; expires: number }>();

async function getSuggestions(url: string): Promise<SuggestionResponse> {
  const now = Date.now();
  const entry = cache.get(url);
  if (entry && entry.expires > now) return entry.data;

  const data = await fetchSuggestions(url);
  cache.set(url, { data, expires: now + 3600_000 });
  return data;
}

/**
 * Payload CMS afterRead hook that enriches documents with SEO data.
 *
 * Usage in collection config:
 *   hooks: { afterRead: [seojuiceAfterRead("https://example.com/blog")] }
 */
export function seojuiceAfterRead(baseUrl: string): CollectionAfterReadHook {
  return async ({ doc, req }) => {
    if (req?.payloadAPI === "local" || doc._status === "draft") return doc;

    try {
      const slug = doc.slug || doc.id;
      const seo = await getSuggestions(`${baseUrl}/${slug}`);

      return {
        ...doc,
        _seo: {
          title: seo.title,
          description: seo.meta_description,
          ogTitle: seo.og_title,
          ogDescription: seo.og_description,
          ogImage: seo.og_image,
          structuredData: seo.structured_data,
          internalLinks: seo.suggestions,
        },
      };
    } catch {
      return doc;
    }
  };
}
```

### Contentful

```typescript
// lib/seojuice-contentful.ts
import { createClient } from "contentful";
import { documentToHtmlString } from "@contentful/rich-text-html-renderer";
import { fetchSuggestions, injectSEO } from "seojuice/injection";
import type { Document } from "@contentful/rich-text-types";

const contentful = createClient({
  space: process.env.CONTENTFUL_SPACE_ID!,
  accessToken: process.env.CONTENTFUL_ACCESS_TOKEN!,
});

const cache = new Map<string, { data: any; expires: number }>();

export async function getEnrichedPost(slug: string, siteUrl: string) {
  const entries = await contentful.getEntries({
    content_type: "blogPost",
    "fields.slug": slug,
    limit: 1,
  });

  const entry = entries.items[0];
  if (!entry) return null;

  const html = documentToHtmlString(entry.fields.body as Document);
  const url = `${siteUrl}/blog/${slug}`;

  const now = Date.now();
  const cached = cache.get(url);

  let suggestions;
  if (cached && cached.expires > now) {
    suggestions = cached.data;
  } else {
    suggestions = await fetchSuggestions(url);
    cache.set(url, { data: suggestions, expires: now + 3600_000 });
  }

  // Use injectSEO for link injection on the rendered HTML
  const wrapped = `<html><head></head><body>${html}</body></html>`;
  const enhanced = injectSEO({
    html: wrapped,
    suggestions,
    injectLinks: true,
    injectMetaTags: false,
    injectOGTags: false,
    injectStructuredData: false,
  });

  const bodyMatch = enhanced.match(/<body>([\s\S]*)<\/body>/);

  return {
    entry,
    enrichedHtml: bodyMatch ? bodyMatch[1] : html,
    seo: suggestions,
  };
}
```

### Sanity

```typescript
// lib/seojuice-sanity.ts
import { createClient } from "@sanity/client";
import { toHTML } from "@portabletext/to-html";
import { fetchSuggestions } from "seojuice/injection";
import type { SuggestionResponse, SuggestionLink } from "seojuice/injection";

const sanity = createClient({
  projectId: process.env.SANITY_PROJECT_ID!,
  dataset: "production",
  apiVersion: "2024-01-01",
  useCdn: true,
});

const cache = new Map<string, { data: SuggestionResponse; expires: number }>();

async function getSuggestions(url: string): Promise<SuggestionResponse> {
  const now = Date.now();
  const entry = cache.get(url);
  if (entry && entry.expires > now) return entry.data;

  const data = await fetchSuggestions(url);
  cache.set(url, { data, expires: now + 3600_000 });
  return data;
}

export async function getPostWithSeo(slug: string, siteUrl: string) {
  const post = await sanity.fetch(
    `*[_type == "post" && slug.current == $slug][0]{ title, body, slug }`,
    { slug },
  );

  if (!post) return null;

  const seo = await getSuggestions(`${siteUrl}/blog/${slug}`);
  const html = toHTML(post.body);

  return { post, html, seo };
}
```

### Strapi

```typescript
// lib/seojuice-strapi.ts
import { fetchSuggestions } from "seojuice/injection";
import type { SuggestionResponse } from "seojuice/injection";

const STRAPI_URL = process.env.STRAPI_URL || "http://localhost:1337";
const cache = new Map<string, { data: SuggestionResponse; expires: number }>();

async function getSuggestions(url: string): Promise<SuggestionResponse> {
  const now = Date.now();
  const entry = cache.get(url);
  if (entry && entry.expires > now) return entry.data;

  const data = await fetchSuggestions(url);
  cache.set(url, { data, expires: now + 3600_000 });
  return data;
}

export async function getArticleWithSeo(slug: string, siteUrl: string) {
  const res = await fetch(
    `${STRAPI_URL}/api/articles?filters[slug][$eq]=${encodeURIComponent(slug)}&populate=*`,
  );
  const { data } = await res.json();
  const article = data?.[0];

  if (!article) return null;

  const seo = await getSuggestions(`${siteUrl}/blog/${slug}`);
  return { article: article.attributes, seo };
}
```

### WordPress (Headless REST API)

```typescript
// lib/seojuice-wordpress.ts
import { fetchSuggestions, injectSEO } from "seojuice/injection";

const WP_URL = process.env.WORDPRESS_URL!;
const cache = new Map<string, { data: any; expires: number }>();

export async function getPostWithSeo(slug: string, siteUrl: string) {
  const res = await fetch(
    `${WP_URL}/wp-json/wp/v2/posts?slug=${encodeURIComponent(slug)}&_embed`,
  );
  const posts = await res.json();
  const post = posts[0];

  if (!post) return null;

  const url = `${siteUrl}/blog/${slug}`;
  const now = Date.now();
  const entry = cache.get(url);

  let suggestions;
  if (entry && entry.expires > now) {
    suggestions = entry.data;
  } else {
    suggestions = await fetchSuggestions(url);
    cache.set(url, { data: suggestions, expires: now + 3600_000 });
  }

  const wrapped = `<html><head></head><body>${post.content.rendered}</body></html>`;
  const enhanced = injectSEO({
    html: wrapped,
    suggestions,
    injectLinks: true,
    injectMetaTags: false,
    injectOGTags: false,
    injectStructuredData: false,
  });

  const bodyMatch = enhanced.match(/<body>([\s\S]*)<\/body>/);

  return {
    post,
    enrichedContent: bodyMatch ? bodyMatch[1] : post.content.rendered,
    seo: suggestions,
  };
}
```

### Ghost (Content API)

```typescript
// lib/seojuice-ghost.ts
import GhostContentAPI from "@tryghost/content-api";
import { fetchSuggestions, injectSEO } from "seojuice/injection";
import type { SuggestionResponse } from "seojuice/injection";

const ghost = new GhostContentAPI({
  url: process.env.GHOST_URL!,
  key: process.env.GHOST_CONTENT_API_KEY!,
  version: "v5.0",
});

const cache = new Map<string, { data: SuggestionResponse; expires: number }>();

async function getSuggestions(url: string): Promise<SuggestionResponse> {
  const now = Date.now();
  const entry = cache.get(url);
  if (entry && entry.expires > now) return entry.data;

  const data = await fetchSuggestions(url);
  cache.set(url, { data, expires: now + 3600_000 });
  return data;
}

export async function getPostWithSeo(slug: string, siteUrl: string) {
  const post = await ghost.posts.read({ slug }, { formats: ["html"] });

  if (!post) return null;

  const url = `${siteUrl}/${slug}`;
  const seo = await getSuggestions(url);

  // Ghost returns rendered HTML in post.html — inject internal links
  const wrapped = `<html><head></head><body>${post.html}</body></html>`;
  const enhanced = injectSEO({
    html: wrapped,
    suggestions: seo,
    injectLinks: true,
    injectMetaTags: false,
    injectOGTags: false,
    injectStructuredData: false,
  });

  const bodyMatch = enhanced.match(/<body>([\s\S]*)<\/body>/);

  return {
    post,
    enrichedContent: bodyMatch ? bodyMatch[1] : post.html,
    seo,
  };
}
```

```typescript
// Next.js usage: app/[slug]/page.tsx
import { getPostWithSeo } from "@/lib/seojuice-ghost";
import { unstable_cache } from "next/cache";

const getPost = unstable_cache(
  (slug: string) => getPostWithSeo(slug, "https://example.com"),
  ["ghost-post"],
  { revalidate: 3600 },
);

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const result = await getPost(params.slug);
  if (!result) return {};

  return {
    title: result.seo.title || result.post.title,
    description: result.seo.meta_description || result.post.excerpt,
    openGraph: {
      title: result.seo.og_title || result.post.title,
      description: result.seo.og_description || result.post.excerpt,
      images: result.seo.og_image
        ? [result.seo.og_image]
        : result.post.feature_image
          ? [result.post.feature_image]
          : [],
    },
  };
}

export default async function Post({ params }: { params: { slug: string } }) {
  const result = await getPost(params.slug);
  if (!result) return <div>Not found</div>;

  return (
    <>
      {result.seo.structured_data && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: result.seo.structured_data }}
        />
      )}
      <article>
        <h1>{result.post.title}</h1>
        <div dangerouslySetInnerHTML={{ __html: result.enrichedContent }} />
      </article>
    </>
  );
}
```

## Intelligence API + CMS Workflow

Use the Intelligence API to drive content operations in your CMS:

```typescript
import { SEOJuice, autoPaginate } from "seojuice";

const client = new SEOJuice({ apiKey: process.env.SEOJUICE_API_KEY! });

// Find content gaps — topics to create new CMS entries for
for await (const gap of autoPaginate((params) =>
  client.content.listGaps("example.com", { ...params, intent: "informational" }),
)) {
  console.log("Missing topic:", gap.keyword, "Volume:", gap.search_volume);
}

// Find decaying content that needs updates
for await (const alert of autoPaginate((params) =>
  client.content.listDecayAlerts("example.com", {
    ...params,
    is_active: true,
    severity: "high",
  }),
)) {
  console.log("Needs refresh:", alert.url, "Decline:", alert.decline_pct);
}

// Build "Related Posts" sections
const related = await client.similar.find("example.com", {
  url: "https://example.com/blog/current-post",
  limit: 5,
});
```

## Edge Runtime / Cloudflare Workers

```typescript
import { fetchSuggestions, injectSEO } from "seojuice/injection";

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const cacheKey = `seo:${url.pathname}`;

    // Check KV cache
    let suggestions = await env.SEO_CACHE.get(cacheKey, "json");

    if (!suggestions) {
      suggestions = await fetchSuggestions(url.toString());
      await env.SEO_CACHE.put(cacheKey, JSON.stringify(suggestions), {
        expirationTtl: 3600,
      });
    }

    const response = await fetch(request);
    const html = await response.text();

    return new Response(injectSEO({ html, suggestions }), {
      headers: response.headers,
    });
  },
};
```

## TypeScript

All types are exported:

```typescript
import type {
  SEOJuiceConfig,
  WebsiteDetail,
  PageSummary,
  IntelligenceSummary,
  ContentGap,
  SimilarPage,
  ChangeRecord,
  ChangeStats,
  ChangeSettings,
  BulkActionParams,
  BulkActionResult,
  ChangeWebhookPayload,
  SuggestionResponse,
  SuggestionLink,
  PaginatedResult,
  PaginationParams,
} from "seojuice";

// Enums for type-safe filtering
import { ChangeStatus, ChangeType, AutomationMode } from "seojuice";
```

## Security

- **API keys** are sent via the `Authorization: Bearer` header over HTTPS only. Never expose keys in client-side code.
- **HTML injection** uses attribute escaping (`&`, `"`, `'`, `<`, `>`) to prevent XSS when injecting meta tags and OG tags.
- **Structured data** from the API is escaped before injection: it escapes every `<` in the serialized JSON-LD as the JSON unicode escape `\u003c` (so a `</script>` in any value cannot break out of the `<script type="application/ld+json">` tag; the escape round-trips back to `<`, keeping the JSON-LD valid).
- **No `eval()` or `Function()`** — the SDK never evaluates dynamic code.
- **No file system access** — the SDK works in sandboxed environments (Workers, edge runtimes).
- **Timeouts** are enforced on all network requests to prevent hanging connections.

Report security issues to security@seojuice.com.

## License

[MIT](LICENSE)
