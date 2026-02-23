/**
 * Ghost CMS — Server-side SEO injection for Ghost Content API.
 *
 * Fetches posts from Ghost's Content API, then injects SEOJuice
 * internal links into the rendered HTML. Works with any frontend
 * framework (Next.js, Nuxt, SvelteKit, Astro, etc.).
 *
 * Ghost already renders Mobiledoc/Lexical content to HTML, so we
 * can inject links directly into the `post.html` field.
 *
 * Requires: @tryghost/content-api
 */
import GhostContentAPI from "@tryghost/content-api";
import { fetchSuggestions, injectSEO } from "seojuice/injection";
import type { SuggestionResponse } from "seojuice/injection";

// --- Ghost client ---

const ghost = new GhostContentAPI({
  url: process.env.GHOST_URL!,
  key: process.env.GHOST_CONTENT_API_KEY!,
  version: "v5.0",
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

// --- Single post enrichment ---

/**
 * Fetch a Ghost post by slug and enrich it with SEOJuice SEO data.
 *
 * Returns the original Ghost post, the enriched HTML content (with
 * internal links injected), and the full SEO suggestions for meta/OG tags.
 *
 * @param slug - The post slug
 * @param siteUrl - Your site's base URL (e.g., "https://example.com")
 */
export async function getPostWithSeo(slug: string, siteUrl: string) {
  const post = await ghost.posts.read(
    { slug },
    { formats: ["html"], include: ["tags", "authors"] },
  );

  if (!post) return null;

  const url = `${siteUrl}/${slug}`;
  const seo = await getSuggestions(url);

  // Ghost delivers rendered HTML in post.html — inject internal links
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

// --- Multiple posts (index page) ---

/**
 * Fetch recent Ghost posts and enrich each with SEO data.
 * Useful for blog index pages where you want internal links in excerpts.
 */
export async function getPostsWithSeo(siteUrl: string, limit = 10) {
  const posts = await ghost.posts.browse({
    limit,
    formats: ["html"],
    include: ["tags"],
  });

  const enriched = await Promise.all(
    posts.map(async (post) => {
      const url = `${siteUrl}/${post.slug}`;

      try {
        const seo = await getSuggestions(url);
        return { post, seo };
      } catch {
        return { post, seo: null };
      }
    }),
  );

  return enriched;
}

// --- Next.js App Router usage ---
//
// // app/[slug]/page.tsx
// import { getPostWithSeo } from "@/lib/ghost-seojuice";
// import { unstable_cache } from "next/cache";
//
// const getPost = unstable_cache(
//   (slug: string) => getPostWithSeo(slug, "https://example.com"),
//   ["ghost-post"],
//   { revalidate: 3600 },
// );
//
// export async function generateMetadata({ params }) {
//   const result = await getPost(params.slug);
//   if (!result) return {};
//
//   return {
//     title: result.seo.title || result.post.title,
//     description: result.seo.meta_description || result.post.excerpt,
//     openGraph: {
//       title: result.seo.og_title || result.post.title,
//       description: result.seo.og_description || result.post.excerpt,
//       images: result.seo.og_image
//         ? [result.seo.og_image]
//         : result.post.feature_image
//           ? [result.post.feature_image]
//           : [],
//     },
//   };
// }
//
// export default async function Post({ params }) {
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
//       <article>
//         <h1>{result.post.title}</h1>
//         {result.post.feature_image && (
//           <img src={result.post.feature_image} alt={result.post.title} />
//         )}
//         <div dangerouslySetInnerHTML={{ __html: result.enrichedContent }} />
//       </article>
//     </>
//   );
// }
//
// --- SvelteKit usage ---
//
// // src/routes/[slug]/+page.server.ts
// import { getPostWithSeo } from "$lib/ghost-seojuice";
//
// export const load = async ({ params }) => {
//   const result = await getPostWithSeo(params.slug, "https://example.com");
//   if (!result) throw error(404);
//   return result;
// };
