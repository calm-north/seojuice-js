/**
 * Next.js Middleware — Full HTML injection at the edge.
 *
 * Intercepts HTML responses and injects SEO meta tags, Open Graph tags,
 * structured data, and internal link data before the page reaches the browser.
 * injectSEO now applies full server-side parity (links, alt, diffs, h1, broken-links).
 *
 * Best for: static exports, ISR pages, or any route where you want
 * transparent SEO enhancement without modifying page components.
 *
 * Note: this hand-rolled example is illustrative of the caching/fetch shape;
 * for a batteries-included, production-ready middleware (including the
 * origin-fetch pattern needed to actually read the rendered HTML — see
 * `seojuice/next`'s doc comment for why `NextResponse.next()` alone cannot),
 * use `createSeoMiddleware` from `seojuice/next` instead of hand-rolling this.
 */
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { fetchSuggestions, injectSEO } from "seojuice/injection";
import type { SuggestionResponse } from "seojuice/injection";

// In-memory cache (per-worker in serverless, shared in long-lived servers)
const cache = new Map<string, { data: SuggestionResponse; expires: number }>();
const CACHE_TTL = 3600_000; // 1 hour

async function getCachedSuggestions(
  url: string,
): Promise<SuggestionResponse | null> {
  const now = Date.now();
  const entry = cache.get(url);

  if (entry && entry.expires > now) {
    return entry.data;
  }

  try {
    const data = await fetchSuggestions(url);
    cache.set(url, { data, expires: now + CACHE_TTL });
    return data;
  } catch {
    return null; // Fail open
  }
}

export async function middleware(request: NextRequest) {
  const response = await NextResponse.next();
  const contentType = response.headers.get("content-type") || "";

  // Only process HTML responses
  if (!contentType.includes("text/html")) {
    return response;
  }

  const suggestions = await getCachedSuggestions(request.nextUrl.toString());
  if (!suggestions) return response;

  const html = await response.text();
  const enhanced = injectSEO({ html, suggestions });

  // Strip stale length/encoding headers — the body changed size, and the
  // upstream Content-Encoding no longer matches the (now-uncompressed) text.
  const headers = new Headers(response.headers);
  headers.delete("content-length");
  headers.delete("content-encoding");

  return new NextResponse(enhanced, {
    status: response.status,
    headers,
  });
}

// Only run on content pages, not API routes or static assets
export const config = {
  matcher: ["/blog/:path*", "/docs/:path*", "/pages/:path*"],
};
