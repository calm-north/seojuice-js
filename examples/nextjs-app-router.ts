/**
 * Next.js App Router — Server Components with built-in caching.
 *
 * Uses Next.js `unstable_cache` (or `next/cache` in newer versions) for
 * automatic ISR-style revalidation of SEO suggestions.
 */
import { fetchSuggestions } from "seojuice/injection";
import type { SuggestionResponse } from "seojuice/injection";
import { unstable_cache } from "next/cache";
import type { Metadata } from "next";

// Cache suggestions with 1-hour revalidation
const getSuggestions = unstable_cache(
  async (url: string): Promise<SuggestionResponse> => fetchSuggestions(url),
  ["seojuice-suggestions"],
  { revalidate: 3600 },
);

// --- generateMetadata for <head> tags ---

interface PageProps {
  params: { slug: string };
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const url = `https://example.com/blog/${params.slug}`;
  const seo = await getSuggestions(url);

  return {
    title: seo.title || undefined,
    description: seo.meta_description || undefined,
    keywords: seo.meta_keywords || undefined,
    openGraph: {
      title: seo.og_title || undefined,
      description: seo.og_description || undefined,
      url: seo.og_url || undefined,
      images: seo.og_image ? [{ url: seo.og_image }] : [],
    },
  };
}

// --- Page component ---

export default async function BlogPost({ params }: PageProps) {
  const url = `https://example.com/blog/${params.slug}`;
  const seo = await getSuggestions(url);

  // Fetch your actual blog content from your CMS / DB here
  const content = "<p>Your blog content here...</p>";

  return (
    <>
      {/* Structured data */}
      {seo.structured_data && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: seo.structured_data }}
        />
      )}

      {/* Internal link suggestions as JSON for client-side injection */}
      {seo.suggestions.length > 0 && (
        <script
          type="application/json"
          id="seojuice-links"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(seo.suggestions),
          }}
        />
      )}

      <article dangerouslySetInnerHTML={{ __html: content }} />
    </>
  );
}
