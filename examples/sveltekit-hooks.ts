/**
 * SvelteKit — Server hooks for transparent HTML injection.
 *
 * Intercepts all HTML responses and injects SEO data (meta tags,
 * structured data, internal links) without touching individual routes.
 *
 * Place this file at: src/hooks.server.ts
 */
import { fetchSuggestions, injectSEO } from "seojuice/injection";
import type { SuggestionResponse } from "seojuice/injection";
import type { Handle } from "@sveltejs/kit";

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
    return null;
  }
}

export const handle: Handle = async ({ event, resolve }) => {
  const response = await resolve(event);
  const contentType = response.headers.get("content-type") || "";

  if (!contentType.includes("text/html")) {
    return response;
  }

  const suggestions = await getCachedSuggestions(event.url.toString());
  if (!suggestions) return response;

  const html = await response.text();
  const enhanced = injectSEO({ html, suggestions });

  return new Response(enhanced, {
    status: response.status,
    headers: response.headers,
  });
};
