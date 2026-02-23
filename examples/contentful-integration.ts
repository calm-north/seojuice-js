/**
 * Contentful — Server-side SEO injection for rich text content.
 *
 * Fetches entries from Contentful, renders rich text to HTML,
 * then injects SEOJuice internal links into the rendered output.
 *
 * Supports both the Content Delivery API (published content)
 * and Content Preview API (draft content).
 */
import { createClient } from "contentful";
import { documentToHtmlString } from "@contentful/rich-text-html-renderer";
import { fetchSuggestions, injectSEO } from "seojuice/injection";
import type { SuggestionResponse } from "seojuice/injection";
import type { Document } from "@contentful/rich-text-types";

// --- Contentful client ---

const contentful = createClient({
  space: process.env.CONTENTFUL_SPACE_ID!,
  accessToken: process.env.CONTENTFUL_ACCESS_TOKEN!,
});

// --- Caching layer ---

const cache = new Map<string, { data: SuggestionResponse; expires: number }>();
const CACHE_TTL = 3600_000; // 1 hour

async function getSuggestions(url: string): Promise<SuggestionResponse> {
  const now = Date.now();
  const entry = cache.get(url);
  if (entry && entry.expires > now) return entry.data;

  const data = await fetchSuggestions(url);
  cache.set(url, { data, expires: now + CACHE_TTL });
  return data;
}

// --- Enrichment function ---

/**
 * Fetch a Contentful blog post and enrich it with SEOJuice data.
 *
 * Returns the original entry, the enriched HTML (with internal links injected),
 * and the full SEO suggestion response for meta tags/structured data.
 *
 * @param slug - The post slug field in Contentful
 * @param siteUrl - Your site's base URL (e.g., "https://example.com")
 */
export async function getEnrichedPost(slug: string, siteUrl: string) {
  // Fetch from Contentful
  const entries = await contentful.getEntries({
    content_type: "blogPost",
    "fields.slug": slug,
    limit: 1,
  });

  const entry = entries.items[0];
  if (!entry) return null;

  // Render rich text to HTML
  const html = documentToHtmlString(entry.fields.body as Document);

  // Get SEO suggestions (cached)
  const url = `${siteUrl}/blog/${slug}`;
  const seo = await getSuggestions(url);

  // Wrap in minimal HTML document so injectSEO can insert link data,
  // then extract just the body content
  const wrapped = `<html><head></head><body>${html}</body></html>`;
  const enhanced = injectSEO({
    html: wrapped,
    suggestions: seo,
    injectLinks: true,
    injectMetaTags: false, // Handle via framework's <head> management
    injectOGTags: false,
    injectStructuredData: false,
  });

  const bodyMatch = enhanced.match(/<body>([\s\S]*)<\/body>/);

  return {
    entry,
    enrichedHtml: bodyMatch ? bodyMatch[1] : html,
    seo,
  };
}

// --- Next.js App Router usage ---
//
// // app/blog/[slug]/page.tsx
// import { getEnrichedPost } from "@/lib/contentful-seojuice";
// import { unstable_cache } from "next/cache";
//
// const getPost = unstable_cache(
//   (slug: string) => getEnrichedPost(slug, "https://example.com"),
//   ["contentful-post"],
//   { revalidate: 3600 },
// );
//
// export async function generateMetadata({ params }) {
//   const result = await getPost(params.slug);
//   if (!result) return {};
//
//   return {
//     title: result.seo.title,
//     description: result.seo.meta_description,
//     openGraph: {
//       title: result.seo.og_title,
//       description: result.seo.og_description,
//       images: result.seo.og_image ? [result.seo.og_image] : [],
//     },
//   };
// }
//
// export default async function BlogPost({ params }) {
//   const result = await getPost(params.slug);
//   if (!result) return <div>Not found</div>;
//
//   return (
//     <>
//       {result.seo.structured_data && (
//         <script
//           type="application/ld+json"
//           dangerouslySetInnerHTML={{ __html: result.seo.structured_data }}
//         />
//       )}
//       <article dangerouslySetInnerHTML={{ __html: result.enrichedHtml }} />
//     </>
//   );
// }
