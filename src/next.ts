import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { injectResponse } from "./injection.js";

const DEFAULT_API = "https://smart.seojuice.io";

/**
 * Fire-and-forget crawler-analytics beacon (GENERAL plan contract C3).
 * Reports `url`/`user_agent`/`referrer` server-side so JS-less AI crawlers
 * (GPTBot, ClaudeBot, …) that never run the client snippet are still
 * captured. No cookies/body are sent; errors are swallowed and never block
 * or delay the response.
 */
export async function sendViewBeacon(
  apiBase: string,
  url: string,
  userAgent: string,
  referrer: string,
  fetchFn: typeof globalThis.fetch = globalThis.fetch,
): Promise<void> {
  try {
    const u = new URL(`${apiBase}/views`);
    u.searchParams.set("url", url);
    u.searchParams.set("user_agent", userAgent);
    u.searchParams.set("referrer", referrer);
    u.searchParams.set("source", "node_sdk");
    await fetchFn(u.toString());
  } catch {
    /* fire-and-forget */
  }
}

export interface CreateSeoMiddlewareOptions {
  apiBase?: string;
  beacon?: boolean;
}

/**
 * Returns a Next.js middleware function that applies full server-side
 * injection parity (internal links, alt-text, content diffs, h1,
 * broken-link fixes) to HTML responses.
 *
 * Honest constraint: standard Next middleware runs *before* the route and
 * cannot read the rendered page body via `NextResponse.next()`. This
 * middleware therefore uses the origin-fetch pattern — `fetch(request)` to
 * obtain the already-rendered HTML, transform it, and return a new
 * `NextResponse` — correct for SSR/static routes at the cost of a second
 * fetch. If you run a custom server where the HTML is already in hand,
 * call `injectResponse` directly instead. For `<head>` tags in the App
 * Router, prefer `generateMetadata` (see `examples/nextjs-app-router.ts`) —
 * it has no such double-fetch cost.
 */
export function createSeoMiddleware(options: CreateSeoMiddlewareOptions = {}) {
  const apiBase = options.apiBase ?? DEFAULT_API;

  return async function middleware(request: NextRequest): Promise<NextResponse> {
    const url = request.nextUrl.toString();
    const origin = await fetch(request);
    const ct = origin.headers.get("content-type") || "";

    if (!ct.includes("text/html")) return origin as unknown as NextResponse;

    if (options.beacon) {
      void sendViewBeacon(
        apiBase,
        url,
        request.headers.get("user-agent") || "",
        request.headers.get("referer") || "",
      );
    }

    const html = await origin.text();
    const enhanced = await injectResponse({ html, url, apiBase });

    const headers = new Headers(origin.headers);
    headers.delete("content-length");
    headers.delete("content-encoding");

    return new NextResponse(enhanced, { status: origin.status, headers });
  };
}
