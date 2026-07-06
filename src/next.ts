import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { injectResponse } from "./injection.js";

const DEFAULT_API = "https://smart.seojuice.io";

// I3 — a hostile/misbehaving upstream must not be able to OOM the process
// via an unbounded body. 10 MB is generous for real HTML pages.
const MAX_HTML_BYTES = 10_000_000;

/**
 * Sentinel header stamped on the origin self-fetch so a re-entrant middleware
 * invocation (Next.js re-runs middleware on `fetch(request)` subrequests) can
 * detect its own fetch and pass through instead of fetching-and-injecting
 * again. Without it, one request fans out into MAX_RECURSION_DEPTH nested
 * middleware executions + origin fetches before Next's own depth cap breaks it.
 */
const SSR_GUARD_HEADER = "x-seojuice-ssr";

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
    if (request.headers.get(SSR_GUARD_HEADER)) {
      // Re-entrant origin self-fetch: let Next render the page untouched
      // rather than fetch-and-inject a second time.
      return NextResponse.next();
    }

    try {
      const url = request.nextUrl.toString();
      const fwd = new Headers(request.headers);
      fwd.set(SSR_GUARD_HEADER, "1");
      const origin = await fetch(request, { headers: fwd });
      const ct = origin.headers.get("content-type") || "";

      if (!ct.includes("text/html")) return origin as unknown as NextResponse;

      // I3 — never buffer an oversized upstream body into memory. Fail
      // open by serving the origin response untouched (best-effort: only
      // catches the case where the origin declares Content-Length).
      const contentLength = origin.headers.get("content-length");
      if (contentLength && Number(contentLength) > MAX_HTML_BYTES) {
        return origin as unknown as NextResponse;
      }

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
    } catch {
      // C2 — a transient origin hiccup (ECONNREFUSED, aborted stream, etc.)
      // must never become a hard 500 for a page Next would have rendered
      // fine on its own. Fall back to normal rendering.
      return NextResponse.next();
    }
  };
}
