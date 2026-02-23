/**
 * Payload CMS — afterRead hook for automatic SEO enrichment.
 *
 * Attaches SEO metadata and internal link suggestions to every document
 * read from the collection. The `_seo` field is available in your frontend
 * without any additional API calls.
 *
 * Usage in payload.config.ts:
 *
 *   import { seojuiceAfterRead } from "./hooks/payload-seojuice";
 *
 *   export default buildConfig({
 *     collections: [
 *       {
 *         slug: "posts",
 *         hooks: {
 *           afterRead: [seojuiceAfterRead("https://example.com/blog")],
 *         },
 *         fields: [...]
 *       },
 *     ],
 *   });
 */
import { fetchSuggestions } from "seojuice/injection";
import type { SuggestionResponse } from "seojuice/injection";
import type { CollectionAfterReadHook } from "payload/types";

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

/**
 * Creates a Payload afterRead hook that enriches documents with SEO data.
 *
 * @param baseUrl - The base URL for your content (e.g., "https://example.com/blog")
 */
export function seojuiceAfterRead(baseUrl: string): CollectionAfterReadHook {
  return async ({ doc, req }) => {
    // Skip in admin panel requests and for drafts
    if (req?.payloadAPI === "local" || doc._status === "draft") {
      return doc;
    }

    try {
      const slug = doc.slug || doc.id;
      const seo = await getSuggestions(`${baseUrl}/${slug}`);

      return {
        ...doc,
        _seo: {
          title: seo.title,
          description: seo.meta_description,
          ogTitle: seo.og_title,
          ogDescription: seo.og_description,
          ogImage: seo.og_image,
          structuredData: seo.structured_data,
          internalLinks: seo.suggestions,
        },
      };
    } catch {
      return doc; // Fail open — never block content delivery
    }
  };
}

// --- Frontend usage (Next.js + Payload) ---
//
// // app/blog/[slug]/page.tsx
// import { getPayloadClient } from "@/lib/payload";
//
// export default async function BlogPost({ params }) {
//   const payload = await getPayloadClient();
//   const { docs } = await payload.find({
//     collection: "posts",
//     where: { slug: { equals: params.slug } },
//     limit: 1,
//   });
//
//   const post = docs[0];
//   const seo = post._seo; // Attached by the afterRead hook
//
//   return (
//     <>
//       {seo?.structuredData && (
//         <script
//           type="application/ld+json"
//           dangerouslySetInnerHTML={{ __html: seo.structuredData }}
//         />
//       )}
//       <h1>{post.title}</h1>
//       {/* Render rich text content with seo.internalLinks */}
//     </>
//   );
// }
