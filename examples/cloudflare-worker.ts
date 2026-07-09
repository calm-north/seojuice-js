// Illustrative integration — requires @cloudflare/workers-types: `npm i -D @cloudflare/workers-types`. Not type-checked in CI.
/**
 * Cloudflare Worker — Edge SEO injection with KV caching.
 *
 * Sits in front of your origin server. Fetches SEO suggestions,
 * caches them in Cloudflare KV, and injects them into HTML responses.
 *
 * Setup:
 *   1. Create a KV namespace: wrangler kv:namespace create SEO_CACHE
 *   2. Bind it in wrangler.toml:
 *      [[kv_namespaces]]
 *      binding = "SEO_CACHE"
 *      id = "your-namespace-id"
 */
import { fetchSuggestions, injectSEO } from "seojuice/injection";
import type { SuggestionResponse } from "seojuice/injection";

interface Env {
  SEO_CACHE: KVNamespace;
}

const CACHE_TTL = 3600; // 1 hour in seconds

async function getCachedSuggestions(
  url: string,
  kv: KVNamespace,
): Promise<SuggestionResponse | null> {
  const key = `seo:${new URL(url).pathname}`;

  // Try KV cache first
  const cached = await kv.get(key, "json");
  if (cached) return cached as SuggestionResponse;

  try {
    const data = await fetchSuggestions(url);
    await kv.put(key, JSON.stringify(data), { expirationTtl: CACHE_TTL });
    return data;
  } catch {
    return null;
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // Only process GET requests for HTML content
    if (request.method !== "GET") {
      return fetch(request);
    }

    const response = await fetch(request);
    const contentType = response.headers.get("content-type") || "";

    if (!contentType.includes("text/html")) {
      return response;
    }

    const suggestions = await getCachedSuggestions(request.url, env.SEO_CACHE);
    if (!suggestions) return response;

    const html = await response.text();
    const enhanced = injectSEO({ html, suggestions });

    return new Response(enhanced, {
      status: response.status,
      headers: response.headers,
    });
  },
};
