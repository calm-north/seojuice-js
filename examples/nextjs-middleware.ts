/**
 * Next.js Middleware — Full HTML injection at the edge.
 *
 * Intercepts HTML responses and injects SEO meta tags, Open Graph tags,
 * structured data, and internal link data before the page reaches the browser.
 *
 * Best for: static exports, ISR pages, or any route where you want
 * transparent SEO enhancement without modifying page components.
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

  return new NextResponse(enhanced, {
    status: response.status,
    headers: response.headers,
  });
}

// Only run on content pages, not API routes or static assets
export const config = {
  matcher: ["/blog/:path*", "/docs/:path*", "/pages/:path*"],
};
