/**
 * Next.js Static Site Generation — Apply SEO changes at build time.
 *
 * Fetches approved changes from SEOJuice during `getStaticProps`,
 * merges them into page metadata and structured data, then marks
 * them as pulled. After deploy, a webhook handler verifies all
 * pulled changes and triggers ISR revalidation.
 *
 * File structure assumed:
 *   pages/blog/[slug].tsx          — SSG page (this file)
 *   pages/api/webhooks/seojuice.ts — Webhook handler (below)
 */
import { SEOJuice, autoPaginate } from "seojuice";
import type { ChangeRecord } from "seojuice";
import type { GetStaticProps, GetStaticPaths } from "next";
import Head from "next/head";

const client = new SEOJuice({
  apiKey: process.env.SEOJUICE_API_KEY!,
});

const DOMAIN = "example.com";
const INTEGRATION_NAME = "nextjs-ssg";

// --- Types ---

interface BlogPost {
  slug: string;
  title: string;
  content: string;
  metaDescription: string;
  ogTitle: string;
  ogDescription: string;
  ogImage: string;
  structuredData: string | null;
  internalLinks: Array<{ anchor: string; href: string }>;
}

interface PageProps {
  post: BlogPost;
}

// --- CMS data fetching (replace with your CMS client) ---

async function fetchPostFromCms(slug: string): Promise<BlogPost> {
  // Replace with: const post = await cms.posts.get(slug);
  return {
    slug,
    title: "Example Post",
    content: "<p>Your content here</p>",
    metaDescription: "",
    ogTitle: "",
    ogDescription: "",
    ogImage: "",
    structuredData: null,
    internalLinks: [],
  };
}

async function fetchAllSlugs(): Promise<string[]> {
  // Replace with: const posts = await cms.posts.list();
  return ["example-post", "another-post"];
}

// --- Apply SEOJuice changes to page data ---

function applyChanges(post: BlogPost, changes: ChangeRecord[]): BlogPost {
  const updated = { ...post };

  for (const change of changes) {
    if (!change.proposed_value) continue;

    switch (change.change_type) {
      case "title_tag":
        updated.title = change.proposed_value;
        break;
      case "meta_description":
        updated.metaDescription = change.proposed_value;
        break;
      case "og_title":
        updated.ogTitle = change.proposed_value;
        break;
      case "og_description":
        updated.ogDescription = change.proposed_value;
        break;
      case "og_image":
        updated.ogImage = change.proposed_value;
        break;
      case "structured_data":
        updated.structuredData = change.proposed_value;
        break;
      case "internal_link":
        if (change.anchor_text && change.proposed_value) {
          updated.internalLinks.push({
            anchor: change.anchor_text,
            href: change.proposed_value,
          });
        }
        break;
    }
  }

  return updated;
}

// --- SSG: getStaticPaths ---

export const getStaticPaths: GetStaticPaths = async () => {
  const slugs = await fetchAllSlugs();
  return {
    paths: slugs.map((slug) => ({ params: { slug } })),
    fallback: "blocking",
  };
};

// --- SSG: getStaticProps ---

export const getStaticProps: GetStaticProps<PageProps> = async ({
  params,
}) => {
  const slug = params?.slug as string;
  const pageUrl = `https://${DOMAIN}/blog/${slug}`;

  // Fetch CMS content and SEOJuice changes in parallel
  const [post, changesResult] = await Promise.all([
    fetchPostFromCms(slug),
    client.changes.list(DOMAIN, {
      status: "approved",
      url: pageUrl,
    }),
  ]);

  const changes = changesResult.results;

  // Apply SEO changes to the page data
  const enhanced = changes.length > 0 ? applyChanges(post, changes) : post;

  // Mark changes as pulled during build
  if (changes.length > 0) {
    await client.changes
      .bulk(DOMAIN, {
        action: "pull",
        ids: changes.map((c) => c.id),
        integration: INTEGRATION_NAME,
      })
      .catch((err) => {
        // Don't fail the build if marking fails
        console.error(`Failed to mark changes as pulled: ${err}`);
      });
  }

  return {
    props: { post: enhanced },
    revalidate: 3600, // ISR: revalidate every hour
  };
};

// --- Page component ---
// Uses Next.js Head for meta tags and renders CMS content.
// Structured data and HTML content are injected via standard
// Next.js patterns (sanitized by the CMS before reaching here).

export default function BlogPostPage({ post }: PageProps) {
  const canonicalUrl = `https://${DOMAIN}/blog/${post.slug}`;

  return (
    <>
      <Head>
        <title>{post.title}</title>
        {post.metaDescription && (
          <meta name="description" content={post.metaDescription} />
        )}
        {post.ogTitle && (
          <meta property="og:title" content={post.ogTitle} />
        )}
        {post.ogDescription && (
          <meta property="og:description" content={post.ogDescription} />
        )}
        {post.ogImage && (
          <meta property="og:image" content={post.ogImage} />
        )}
        <link rel="canonical" href={canonicalUrl} />
        {post.structuredData && (
          <script type="application/ld+json">{post.structuredData}</script>
        )}
      </Head>

      <article>{post.content}</article>

      {/* Internal link suggestions (render as related links section) */}
      {post.internalLinks.length > 0 && (
        <nav aria-label="Related articles">
          <h2>Related Articles</h2>
          <ul>
            {post.internalLinks.map((link, i) => (
              <li key={i}>
                <a href={link.href}>{link.anchor}</a>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </>
  );
}

// ============================================================
// pages/api/webhooks/seojuice.ts — Webhook handler for ISR
// ============================================================
//
// import crypto from "node:crypto";
// import { SEOJuice, autoPaginate } from "seojuice";
// import type { ChangeWebhookPayload } from "seojuice";
// import type { NextApiRequest, NextApiResponse } from "next";
//
// const WEBHOOK_SECRET = process.env.SEOJUICE_WEBHOOK_SECRET!;
// const client = new SEOJuice({ apiKey: process.env.SEOJUICE_API_KEY! });
// const DOMAIN = "example.com";
// const INTEGRATION_NAME = "nextjs-ssg";
//
// function verifySignature(body: string, signature: string | undefined): boolean {
//   if (!signature) return false;
//   const expected = crypto
//     .createHmac("sha256", WEBHOOK_SECRET)
//     .update(body)
//     .digest("hex");
//   return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
// }
//
// export default async function handler(req: NextApiRequest, res: NextApiResponse) {
//   if (req.method !== "POST") {
//     return res.status(405).json({ error: "Method not allowed" });
//   }
//
//   const rawBody = JSON.stringify(req.body);
//   const signature = req.headers["x-seojuice-signature"] as string | undefined;
//
//   if (!verifySignature(rawBody, signature)) {
//     return res.status(401).json({ error: "Invalid signature" });
//   }
//
//   const payload: ChangeWebhookPayload = req.body;
//
//   // Revalidate the affected page on change.applied or change.reverted
//   if (payload.event === "change.applied" || payload.event === "change.reverted") {
//     const pageUrl = payload.change.page_url;
//     if (pageUrl) {
//       try {
//         const urlPath = new URL(pageUrl).pathname;
//         await res.revalidate(urlPath);
//         console.log(`Revalidated ${urlPath}`);
//       } catch (err) {
//         console.error(`Revalidation failed for ${pageUrl}:`, err);
//       }
//     }
//   }
//
//   // After a deploy, verify all pulled changes
//   // (Call this from your CI/CD pipeline instead if you prefer)
//   if (payload.event === "change.applied") {
//     const pulled: number[] = [];
//     for await (const change of autoPaginate((params) =>
//       client.changes.list(DOMAIN, { ...params, status: "pulled" }),
//     )) {
//       if (change.pulled_by_integration === INTEGRATION_NAME) {
//         pulled.push(change.id);
//       }
//     }
//     if (pulled.length > 0) {
//       await client.changes.bulk(DOMAIN, {
//         action: "verify",
//         ids: pulled,
//         integration: INTEGRATION_NAME,
//       });
//     }
//   }
//
//   res.status(200).json({ received: true });
// }
//
// // next.config.js — disable body parser for raw access:
// // export const config = { api: { bodyParser: true } };
