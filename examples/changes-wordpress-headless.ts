/**
 * Headless WordPress (WPGraphQL) — Override SEO fields with SEOJuice changes.
 *
 * Fetches posts from WordPress via WPGraphQL (with Yoast SEO fields),
 * then overrides meta/OG/structured data with approved SEOJuice changes.
 * Works with any frontend framework (Next.js, Nuxt, Astro, SvelteKit) —
 * this is purely a data layer.
 *
 * Requires: WPGraphQL plugin + Yoast SEO (or RankMath) GraphQL extension
 * on your WordPress instance.
 */
import { SEOJuice, autoPaginate } from "seojuice";
import type { ChangeRecord } from "seojuice";

const client = new SEOJuice({
  apiKey: process.env.SEOJUICE_API_KEY!,
});

const WP_GRAPHQL_URL = process.env.WP_GRAPHQL_URL!; // e.g., "https://cms.example.com/graphql"
const DOMAIN = "example.com";
const INTEGRATION_NAME = "wordpress-headless";

// --- WPGraphQL fetch helper ---

async function wpGraphQL<T>(
  query: string,
  variables: Record<string, unknown> = {},
): Promise<T> {
  const response = await fetch(WP_GRAPHQL_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables }),
  });

  if (!response.ok) {
    throw new Error(`WPGraphQL request failed: ${response.status}`);
  }

  const json = (await response.json()) as { data: T; errors?: unknown[] };
  if (json.errors) {
    throw new Error(`WPGraphQL errors: ${JSON.stringify(json.errors)}`);
  }

  return json.data;
}

// --- WPGraphQL types (Yoast SEO fields) ---

interface WpYoastSeo {
  title: string;
  metaDesc: string;
  opengraphTitle: string;
  opengraphDescription: string;
  opengraphImage: { sourceUrl: string } | null;
  schema: { raw: string } | null;
}

interface WpPost {
  slug: string;
  title: string;
  content: string;
  uri: string;
  seo: WpYoastSeo;
}

interface EnrichedPost {
  post: WpPost;
  seo: {
    title: string;
    metaDescription: string;
    ogTitle: string;
    ogDescription: string;
    ogImage: string;
    structuredData: string | null;
  };
  internalLinks: Array<{ anchor: string; href: string }>;
  appliedChangeIds: number[];
}

// --- WPGraphQL queries ---

const POST_BY_SLUG_QUERY = `
  query PostBySlug($slug: ID!) {
    post(id: $slug, idType: SLUG) {
      slug
      title
      content
      uri
      seo {
        title
        metaDesc
        opengraphTitle
        opengraphDescription
        opengraphImage {
          sourceUrl
        }
        schema {
          raw
        }
      }
    }
  }
`;

const ALL_POSTS_QUERY = `
  query AllPosts($first: Int!, $after: String) {
    posts(first: $first, after: $after) {
      pageInfo {
        hasNextPage
        endCursor
      }
      nodes {
        slug
        title
        content
        uri
        seo {
          title
          metaDesc
          opengraphTitle
          opengraphDescription
          opengraphImage {
            sourceUrl
          }
          schema {
            raw
          }
        }
      }
    }
  }
`;

// --- Fetch approved changes grouped by URL ---

async function fetchChangesByUrl(): Promise<Map<string, ChangeRecord[]>> {
  const grouped = new Map<string, ChangeRecord[]>();

  for await (const change of autoPaginate((params) =>
    client.changes.list(DOMAIN, { ...params, status: "approved" }),
  )) {
    const url = change.page_url ?? "unknown";
    const existing = grouped.get(url) ?? [];
    existing.push(change);
    grouped.set(url, existing);
  }

  return grouped;
}

// --- Override WordPress SEO fields with SEOJuice changes ---

function overrideSeoFields(
  post: WpPost,
  changes: ChangeRecord[],
): EnrichedPost {
  const seo = {
    title: post.seo.title,
    metaDescription: post.seo.metaDesc,
    ogTitle: post.seo.opengraphTitle,
    ogDescription: post.seo.opengraphDescription,
    ogImage: post.seo.opengraphImage?.sourceUrl ?? "",
    structuredData: post.seo.schema?.raw ?? null,
  };

  const internalLinks: Array<{ anchor: string; href: string }> = [];
  const appliedChangeIds: number[] = [];

  for (const change of changes) {
    if (!change.proposed_value) continue;
    appliedChangeIds.push(change.id);

    switch (change.change_type) {
      // meta_description overrides Yoast's metaDesc
      case "meta_description":
        seo.metaDescription = change.proposed_value;
        break;

      // title_tag overrides Yoast's title
      case "title_tag":
        seo.title = change.proposed_value;
        break;

      // og_title overrides Yoast's opengraphTitle
      case "og_title":
        seo.ogTitle = change.proposed_value;
        break;

      // og_description overrides Yoast's opengraphDescription
      case "og_description":
        seo.ogDescription = change.proposed_value;
        break;

      // og_image overrides Yoast's opengraphImage
      case "og_image":
        seo.ogImage = change.proposed_value;
        break;

      // structured_data replaces Yoast's schema
      case "structured_data":
        seo.structuredData = change.proposed_value;
        break;

      // internal_link — append to a sidebar widget or inject into content
      case "internal_link":
        if (change.anchor_text && change.proposed_value) {
          internalLinks.push({
            anchor: change.anchor_text,
            href: change.proposed_value,
          });
        }
        break;
    }
  }

  return { post, seo, internalLinks, appliedChangeIds };
}

// --- Get a single post with SEO overrides ---

export async function getPostWithSeo(slug: string): Promise<EnrichedPost | null> {
  const [wpData, changesByUrl] = await Promise.all([
    wpGraphQL<{ post: WpPost | null }>(POST_BY_SLUG_QUERY, { slug }),
    fetchChangesByUrl(),
  ]);

  if (!wpData.post) return null;

  const pageUrl = `https://${DOMAIN}${wpData.post.uri}`;
  const changes = changesByUrl.get(pageUrl) ?? [];

  const enriched = overrideSeoFields(wpData.post, changes);

  if (changes.length > 0) {
    console.log(
      `[SEOJuice] Applied ${changes.length} changes to ${pageUrl}`,
    );
  }

  return enriched;
}

// --- Get all posts with SEO overrides (for SSG/ISR) ---

export async function getAllPostsWithSeo(): Promise<EnrichedPost[]> {
  const changesByUrl = await fetchChangesByUrl();
  const enriched: EnrichedPost[] = [];

  let after: string | null = null;
  let hasMore = true;

  while (hasMore) {
    const data = await wpGraphQL<{
      posts: {
        pageInfo: { hasNextPage: boolean; endCursor: string };
        nodes: WpPost[];
      };
    }>(ALL_POSTS_QUERY, { first: 50, after });

    for (const post of data.posts.nodes) {
      const pageUrl = `https://${DOMAIN}${post.uri}`;
      const changes = changesByUrl.get(pageUrl) ?? [];
      enriched.push(overrideSeoFields(post, changes));
    }

    hasMore = data.posts.pageInfo.hasNextPage;
    after = data.posts.pageInfo.endCursor;
  }

  const totalChanges = enriched.reduce(
    (sum, e) => sum + e.appliedChangeIds.length,
    0,
  );
  console.log(
    `[SEOJuice] Enriched ${enriched.length} posts with ${totalChanges} changes`,
  );

  return enriched;
}

// --- Mark changes as pulled after build/deploy ---

export async function markChangesAsPulled(
  enrichedPosts: EnrichedPost[],
): Promise<void> {
  const ids = enrichedPosts.flatMap((e) => e.appliedChangeIds);
  if (ids.length === 0) return;

  try {
    const result = await client.changes.bulk(DOMAIN, {
      action: "pull",
      ids,
      integration: INTEGRATION_NAME,
    });

    console.log(
      `[SEOJuice] Marked ${result.total_succeeded} changes as pulled` +
        (result.total_failed > 0
          ? `, ${result.total_failed} failed`
          : ""),
    );
  } catch (err) {
    console.error("[SEOJuice] Failed to mark changes as pulled:", err);
  }
}

// --- Post-deploy verification ---

async function verifyDeployedChanges(): Promise<void> {
  console.log("[Verify] Checking for pulled changes to verify");

  const pulled: number[] = [];
  for await (const change of autoPaginate((params) =>
    client.changes.list(DOMAIN, { ...params, status: "pulled" }),
  )) {
    if (change.pulled_by_integration === INTEGRATION_NAME) {
      pulled.push(change.id);
    }
  }

  if (pulled.length === 0) {
    console.log("[Verify] No changes to verify");
    return;
  }

  const result = await client.changes.bulk(DOMAIN, {
    action: "verify",
    ids: pulled,
    integration: INTEGRATION_NAME,
  });

  console.log(
    `[Verify] Verified ${result.total_succeeded} changes` +
      (result.total_failed > 0
        ? `, ${result.total_failed} failed`
        : ""),
  );
}

// --- Full sync workflow ---

async function main() {
  const mode = process.argv[2] ?? "sync";

  if (mode === "verify") {
    await verifyDeployedChanges();
    return;
  }

  // Fetch all posts with SEO overrides
  const posts = await getAllPostsWithSeo();

  // Mark applied changes as pulled
  await markChangesAsPulled(posts);

  // Output summary
  const stats = await client.changes.stats(DOMAIN);
  console.log("[Stats] Changes by status:", stats.by_status);
}

main().catch(console.error);

// --- Next.js App Router usage ---
//
// // lib/wordpress.ts — re-export getPostWithSeo from this module
//
// // app/blog/[slug]/page.tsx
// import { getPostWithSeo } from "@/lib/wordpress";
//
// export async function generateMetadata({ params }: { params: { slug: string } }) {
//   const result = await getPostWithSeo(params.slug);
//   if (!result) return {};
//
//   return {
//     title: result.seo.title,
//     description: result.seo.metaDescription,
//     openGraph: {
//       title: result.seo.ogTitle,
//       description: result.seo.ogDescription,
//       images: result.seo.ogImage ? [result.seo.ogImage] : [],
//     },
//   };
// }
//
// export default async function BlogPost({ params }: { params: { slug: string } }) {
//   const result = await getPostWithSeo(params.slug);
//   if (!result) return <div>Not found</div>;
//
//   const { post, seo, internalLinks } = result;
//
//   return (
//     <>
//       {seo.structuredData && (
//         <script
//           type="application/ld+json"
//           // Content is from Yoast/SEOJuice — sanitized at source
//           dangerouslySetInnerHTML={{ __html: seo.structuredData }}
//         />
//       )}
//
//       <article>
//         <h1>{post.title}</h1>
//         {/* WordPress renders content server-side — HTML is sanitized by WP */}
//         <div dangerouslySetInnerHTML={{ __html: post.content }} />
//       </article>
//
//       {internalLinks.length > 0 && (
//         <aside aria-label="Related content">
//           <h2>Suggested Reading</h2>
//           <ul>
//             {internalLinks.map((link, i) => (
//               <li key={i}>
//                 <a href={link.href}>{link.anchor}</a>
//               </li>
//             ))}
//           </ul>
//         </aside>
//       )}
//     </>
//   );
// }

// Usage:
//   npx tsx examples/changes-wordpress-headless.ts          # Sync all posts
//   npx tsx examples/changes-wordpress-headless.ts verify   # Verify after deploy
//
// Environment variables:
//   SEOJUICE_API_KEY=sk_xxx
//   WP_GRAPHQL_URL=https://cms.example.com/graphql
//
// Works with any frontend — Next.js, Nuxt, Astro, SvelteKit.
// Import getPostWithSeo() or getAllPostsWithSeo() in your data layer.
