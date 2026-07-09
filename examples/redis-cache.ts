// Illustrative integration — requires redis: `npm i redis`. Not type-checked in CI.
/**
 * Redis caching layer for SEOJuice suggestions.
 *
 * Drop-in replacement for the in-memory cache used in other examples.
 * Suitable for multi-instance deployments where a shared cache is needed.
 */
import { createClient } from "redis";
import { fetchSuggestions } from "seojuice/injection";
import type { SuggestionResponse } from "seojuice/injection";

const redis = createClient({ url: process.env.REDIS_URL });
await redis.connect();

const CACHE_TTL = 3600; // 1 hour in seconds
const KEY_PREFIX = "seojuice:suggestions:";

/**
 * Fetch SEO suggestions with Redis caching.
 *
 * On cache miss, fetches from the SEOJuice smart endpoint and stores
 * the result in Redis with a TTL. On failure, returns null (fail-open).
 */
export async function getCachedSuggestions(
  url: string,
): Promise<SuggestionResponse | null> {
  const key = `${KEY_PREFIX}${url}`;

  try {
    const cached = await redis.get(key);
    if (cached) {
      return JSON.parse(cached) as SuggestionResponse;
    }
  } catch {
    // Redis read failure — fall through to fetch
  }

  try {
    const suggestions = await fetchSuggestions(url);
    // Fire-and-forget the cache write
    redis.setEx(key, CACHE_TTL, JSON.stringify(suggestions)).catch(() => {});
    return suggestions;
  } catch {
    return null;
  }
}

/**
 * Invalidate cached suggestions for a URL.
 * Call this when content is updated in your CMS.
 */
export async function invalidateSuggestions(url: string): Promise<void> {
  await redis.del(`${KEY_PREFIX}${url}`);
}

/**
 * Invalidate all cached suggestions matching a pattern.
 * Example: invalidateByPattern("https://example.com/blog/*")
 */
export async function invalidateByPattern(pattern: string): Promise<void> {
  const keys = [];
  for await (const key of redis.scanIterator({
    MATCH: `${KEY_PREFIX}${pattern}`,
    COUNT: 100,
  })) {
    keys.push(key);
  }

  if (keys.length > 0) {
    await redis.del(keys);
  }
}
