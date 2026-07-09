// Illustrative integration — requires @storyblok/react: `npm i @storyblok/react`. Not type-checked in CI.
/**
 * Storyblok — Server-side internal link injection for richtext content.
 *
 * Fetches SEO suggestions and injects internal links into rendered
 * Storyblok richtext HTML. Works with any framework (Next.js, Nuxt, SvelteKit).
 *
 * Flow:
 *   1. Fetch story from Storyblok CDN API
 *   2. Render richtext to HTML
 *   3. Fetch SEOJuice suggestions (cached)
 *   4. Inject internal links into the rendered HTML
 */
import { getStoryblokApi, renderRichText } from "@storyblok/react";
import { fetchSuggestions } from "seojuice/injection";
import type { SuggestionResponse, SuggestionLink } from "seojuice/injection";

// --- Caching layer ---

const cache = new Map<string, { data: SuggestionResponse; expires: number }>();
const CACHE_TTL = 3600_000;

async function getSuggestions(url: string): Promise<SuggestionResponse> {
  const now = Date.now();
  const entry = cache.get(url);
  if (entry && entry.expires > now) return entry.data;

  const data = await fetchSuggestions(url);
  cache.set(url, { data, expires: now + CACHE_TTL });
  return data;
}

// --- Link injection ---

/**
 * Inject internal links into rendered HTML. Each keyword is linked once
 * (first occurrence), and existing <a> tags are preserved.
 */
export function injectLinksIntoHtml(
  html: string,
  links: SuggestionLink[],
): string {
  let result = html;

  for (const link of links) {
    const escaped = link.keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    // Match whole word, not inside an existing anchor tag
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

// --- Full integration ---

export async function getStoryWithSeo(slug: string, siteUrl: string) {
  const api = getStoryblokApi();
  const { data } = await api.get(`cdn/stories/${slug}`, {
    version: "published",
  });

  const story = data.story;
  const url = `${siteUrl}/${slug}`;
  const seo = await getSuggestions(url);

  // Render Storyblok richtext, then inject internal links
  const bodyHtml = renderRichText(story.content.body);
  const enrichedHtml = injectLinksIntoHtml(bodyHtml, seo.suggestions ?? []);

  return { story, enrichedHtml, seo };
}

// --- Usage in Next.js App Router ---
//
// // app/[...slug]/page.tsx
// import { getStoryWithSeo } from "@/lib/storyblok-seojuice";
//
// export default async function Page({ params }) {
//   const slug = params.slug?.join("/") || "home";
//   const { story, enrichedHtml, seo } = await getStoryWithSeo(
//     slug,
//     "https://example.com",
//   );
//
//   return (
//     <>
//       {seo.structured_data && (
//         <script
//           type="application/ld+json"
//           dangerouslySetInnerHTML={{ __html: seo.structured_data }}
//         />
//       )}
//       <article dangerouslySetInnerHTML={{ __html: enrichedHtml }} />
//     </>
//   );
// }
