/**
 * Astro — SSG/SSR integration for applying SEO changes at build time.
 *
 * Fetches approved changes during static generation, applies them
 * to page frontmatter and head tags, marks them as pulled, and
 * verifies after deploy. Also shows SSR mode with caching and a
 * webhook endpoint for triggering rebuilds.
 *
 * File structure assumed:
 *   src/lib/seojuice.ts              — Shared helpers (this file)
 *   src/pages/blog/[slug].astro      — Blog page (Astro syntax in comments)
 *   src/pages/api/webhooks/seojuice.ts — Webhook endpoint
 *   scripts/verify-changes.ts        — Post-deploy verification script
 */
import crypto from "node:crypto";
import { SEOJuice, autoPaginate } from "seojuice";
import type { ChangeRecord, ChangeWebhookPayload } from "seojuice";

const client = new SEOJuice({
  apiKey: process.env.SEOJUICE_API_KEY!,
});

const DOMAIN = "example.com";
const INTEGRATION_NAME = "astro-ssg";

// --- Types ---

interface PageData {
  slug: string;
  title: string;
  description: string;
  metaKeywords: string;
  ogTitle: string;
  ogDescription: string;
  ogImage: string;
  structuredData: string | null;
  localSchema: string | null;
  content: string;
  internalLinks: Array<{ anchor: string; href: string }>;
  imageAlts: Array<{ alt: string; metadata: Record<string, unknown> }>;
  accessibilityFixes: Array<{ fix: string; metadata: Record<string, unknown> }>;
  napFix: string | null;
}

interface HeadTag {
  tag: string;
  attrs: Record<string, string>;
  content?: string;
}

// --- CMS helpers (replace with your CMS client) ---

async function fetchAllPages(): Promise<PageData[]> {
  // Replace with: const pages = await cms.pages.list();
  return [
    {
      slug: "example-post",
      title: "Example Post",
      description: "",
      metaKeywords: "",
      ogTitle: "",
      ogDescription: "",
      ogImage: "",
      structuredData: null,
      localSchema: null,
      content: "<p>Your content here</p>",
      internalLinks: [],
      imageAlts: [],
      accessibilityFixes: [],
      napFix: null,
    },
  ];
}

async function fetchPageBySlug(slug: string): Promise<PageData | null> {
  // Replace with: const page = await cms.pages.get(slug);
  const pages = await fetchAllPages();
  return pages.find((p) => p.slug === slug) ?? null;
}

// --- Apply changes to page data ---

function applyChanges(page: PageData, changes: ChangeRecord[]): PageData {
  const updated = { ...page };

  for (const change of changes) {
    if (!change.proposed_value) continue;

    switch (change.change_type) {
      case "title_tag":
        updated.title = change.proposed_value;
        break;
      case "meta_description":
        updated.description = change.proposed_value;
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
      case "meta_keywords":
        updated.metaKeywords = change.proposed_value;
        break;
      case "local_schema":
        // Local Business schema — render as a separate JSON-LD block
        updated.localSchema = change.proposed_value;
        break;
      case "image_alt":
        // Image alt text — identify image from llm_metadata.visual_elements_detected
        // and update in the CMS or at render time
        updated.imageAlts.push({
          alt: change.proposed_value,
          metadata: change.llm_metadata,
        });
        break;
      case "accessibility":
        // ARIA labels, focus fixes — typically applied at render time
        // Store for component-level application
        updated.accessibilityFixes.push({
          fix: change.proposed_value,
          metadata: change.llm_metadata,
        });
        break;
      case "nap_fix":
        // NAP consistency — update business Name/Address/Phone
        updated.napFix = change.proposed_value;
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

// --- Build head tags from page data ---

function buildHeadTags(page: PageData): HeadTag[] {
  const tags: HeadTag[] = [];

  if (page.description) {
    tags.push({
      tag: "meta",
      attrs: { name: "description", content: page.description },
    });
  }
  if (page.ogTitle) {
    tags.push({
      tag: "meta",
      attrs: { property: "og:title", content: page.ogTitle },
    });
  }
  if (page.ogDescription) {
    tags.push({
      tag: "meta",
      attrs: { property: "og:description", content: page.ogDescription },
    });
  }
  if (page.ogImage) {
    tags.push({
      tag: "meta",
      attrs: { property: "og:image", content: page.ogImage },
    });
  }

  return tags;
}

// --- Inject internal links into HTML content ---

function injectInternalLinks(
  html: string,
  links: Array<{ anchor: string; href: string }>,
): string {
  if (links.length === 0) return html;

  // Build a related links section to append
  const linkItems = links
    .map((link) => `<li><a href="${escapeHtml(link.href)}">${escapeHtml(link.anchor)}</a></li>`)
    .join("\n      ");

  const relatedSection = `
    <nav aria-label="Related articles">
      <h2>Related Articles</h2>
      <ul>
        ${linkItems}
      </ul>
    </nav>`;

  return html + relatedSection;
}

// ============================================================
// SSG: getStaticPaths — Generate paths from CMS pages
// ============================================================
//
// Called at build time. Fetches all CMS pages, then for each page
// fetches approved changes, applies them, and marks as pulled.

async function getStaticPaths(): Promise<
  Array<{ params: { slug: string }; props: { page: PageData } }>
> {
  const pages = await fetchAllPages();
  const paths: Array<{
    params: { slug: string };
    props: { page: PageData };
  }> = [];

  for (const page of pages) {
    const pageUrl = `https://${DOMAIN}/blog/${page.slug}`;

    // Fetch approved changes for this page
    const changesResult = await client.changes.list(DOMAIN, {
      status: "approved",
      url: pageUrl,
    });

    const changes = changesResult.results;
    const enhanced = changes.length > 0 ? applyChanges(page, changes) : page;

    // Mark changes as pulled during build
    if (changes.length > 0) {
      await client.changes
        .bulk(DOMAIN, {
          action: "pull",
          ids: changes.map((c) => c.id),
          integration: INTEGRATION_NAME,
        })
        .catch((err) => {
          console.error(
            `[build] Failed to mark changes as pulled for ${page.slug}:`,
            err,
          );
        });
    }

    paths.push({
      params: { slug: page.slug },
      props: { page: enhanced },
    });
  }

  return paths;
}

// ============================================================
// SSR: Fetch changes on each request with caching
// ============================================================
//
// Alternative to SSG — fetches changes at request time with an
// in-memory cache. Use this when `output: "server"` in astro.config.

const cache = new Map<string, { page: PageData; expires: number }>();
const CACHE_TTL = 3600_000; // 1 hour

async function getPageWithChanges(slug: string): Promise<PageData | null> {
  const now = Date.now();
  const cached = cache.get(slug);

  if (cached && cached.expires > now) {
    return cached.page;
  }

  const page = await fetchPageBySlug(slug);
  if (!page) return null;

  const pageUrl = `https://${DOMAIN}/blog/${slug}`;

  try {
    const changesResult = await client.changes.list(DOMAIN, {
      status: "applied",
      url: pageUrl,
    });

    const enhanced =
      changesResult.results.length > 0
        ? applyChanges(page, changesResult.results)
        : page;

    cache.set(slug, { page: enhanced, expires: now + CACHE_TTL });
    return enhanced;
  } catch (err) {
    console.error(`[ssr] Failed to fetch changes for ${slug}:`, err);
    return page;
  }
}

// Invalidate cache for a specific slug (called from webhook)
function invalidateCache(slug: string): void {
  cache.delete(slug);
}

function invalidateAllCache(): void {
  cache.clear();
}

// ============================================================
// Webhook endpoint (src/pages/api/webhooks/seojuice.ts)
// ============================================================
//
// Astro API route that verifies HMAC signature and triggers
// a rebuild (SSG) or cache invalidation (SSR).

const WEBHOOK_SECRET = process.env.SEOJUICE_WEBHOOK_SECRET!;

function verifySignature(
  body: string,
  signature: string | undefined,
): boolean {
  if (!signature) return false;

  const expected = crypto
    .createHmac("sha256", WEBHOOK_SECRET)
    .update(body)
    .digest("hex");

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expected),
  );
}

async function handleWebhook(request: Request): Promise<Response> {
  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const rawBody = await request.text();
  const signature = request.headers.get("x-seojuice-signature") ?? undefined;

  if (!verifySignature(rawBody, signature)) {
    return new Response(
      JSON.stringify({ error: "Invalid signature" }),
      { status: 401, headers: { "Content-Type": "application/json" } },
    );
  }

  const payload: ChangeWebhookPayload = JSON.parse(rawBody);

  if (
    payload.event === "change.applied" ||
    payload.event === "change.reverted"
  ) {
    const pageUrl = payload.change.page_url;

    if (pageUrl) {
      // SSR mode: invalidate the cache for this page
      try {
        const slug = new URL(pageUrl).pathname.split("/").pop();
        if (slug) {
          invalidateCache(slug);
          console.log(`[webhook] Invalidated cache for ${slug}`);
        }
      } catch {
        console.error(`[webhook] Could not parse URL: ${pageUrl}`);
      }

      // SSG mode: trigger a rebuild via your hosting platform
      // Netlify:
      //   await fetch(process.env.NETLIFY_BUILD_HOOK!, { method: "POST" });
      // Vercel:
      //   await fetch("https://api.vercel.com/v1/deployments", { ... });
      // Cloudflare Pages:
      //   await fetch(`https://api.cloudflare.com/client/v4/pages/webhooks/deploy_hooks/${hookId}`, { method: "POST" });
      console.log(`[webhook] Triggering rebuild for ${pageUrl}`);
    }
  }

  return new Response(
    JSON.stringify({ received: true }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  );
}

// ============================================================
// Post-deploy verification script (scripts/verify-changes.ts)
// ============================================================
//
// Run after deploy to verify all changes marked as pulled by
// this integration are live on the site.

async function verifyDeployedChanges(): Promise<void> {
  console.log(`[verify] Checking for pulled changes to verify`);

  const pulled: number[] = [];
  for await (const change of autoPaginate((params) =>
    client.changes.list(DOMAIN, { ...params, status: "pulled" }),
  )) {
    if (change.pulled_by_integration === INTEGRATION_NAME) {
      pulled.push(change.id);
    }
  }

  if (pulled.length === 0) {
    console.log("[verify] No changes to verify");
    return;
  }

  const result = await client.changes.bulk(DOMAIN, {
    action: "verify",
    ids: pulled,
    integration: INTEGRATION_NAME,
  });

  console.log(
    `[verify] Verified ${result.total_succeeded} changes` +
      (result.total_failed > 0
        ? `, ${result.total_failed} failed`
        : ""),
  );

  for (const failure of result.failed) {
    console.warn(`  Change #${failure.id}: ${failure.error}`);
  }
}

// --- Helpers ---

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// --- Exports ---

export {
  getStaticPaths,
  getPageWithChanges,
  buildHeadTags,
  injectInternalLinks,
  applyChanges,
  handleWebhook,
  verifyDeployedChanges,
  invalidateCache,
  invalidateAllCache,
};
export type { PageData, HeadTag };

// ============================================================
// Astro page component (src/pages/blog/[slug].astro)
// ============================================================
//
// ---
// import {
//   getStaticPaths as getPaths,
//   buildHeadTags,
//   injectInternalLinks,
// } from "../../lib/seojuice";
// import type { PageData } from "../../lib/seojuice";
// import Layout from "../../layouts/Layout.astro";
//
// export const getStaticPaths = getPaths;
//
// interface Props {
//   page: PageData;
// }
//
// const { page } = Astro.props;
// const headTags = buildHeadTags(page);
// const contentWithLinks = injectInternalLinks(page.content, page.internalLinks);
// ---
//
// <Layout title={page.title}>
//   <Fragment slot="head">
//     {headTags.map((tag) => (
//       <meta {...tag.attrs} />
//     ))}
//     {page.structuredData && (
//       <script type="application/ld+json" set:html={page.structuredData} />
//     )}
//   </Fragment>
//
//   <article>
//     <h1>{page.title}</h1>
//     <Fragment set:html={contentWithLinks} />
//   </article>
// </Layout>

// ============================================================
// SSR variant (src/pages/blog/[slug].astro with output: "server")
// ============================================================
//
// ---
// import { getPageWithChanges, buildHeadTags, injectInternalLinks } from "../../lib/seojuice";
// import Layout from "../../layouts/Layout.astro";
//
// const { slug } = Astro.params;
// const page = await getPageWithChanges(slug!);
//
// if (!page) {
//   return Astro.redirect("/404");
// }
//
// const headTags = buildHeadTags(page);
// const contentWithLinks = injectInternalLinks(page.content, page.internalLinks);
//
// Astro.response.headers.set("Cache-Control", "public, max-age=60, s-maxage=3600");
// ---
//
// <Layout title={page.title}>
//   <!-- Same template as SSG variant above -->
// </Layout>

// ============================================================
// Webhook API route (src/pages/api/webhooks/seojuice.ts)
// ============================================================
//
// import type { APIRoute } from "astro";
// import { handleWebhook } from "../../lib/seojuice";
//
// export const POST: APIRoute = async ({ request }) => {
//   return handleWebhook(request);
// };

// ============================================================
// Post-deploy script (scripts/verify-changes.ts)
// ============================================================
//
//   npx tsx scripts/verify-changes.ts
//
// Or add to your CI/CD pipeline:
//
//   astro build && npx tsx scripts/verify-changes.ts

// Usage:
//   SEOJUICE_API_KEY=sk_xxx astro build    # SSG: changes applied at build time
//   SEOJUICE_API_KEY=sk_xxx astro dev      # SSR: changes fetched per request
//
// Environment variables:
//   SEOJUICE_API_KEY=sk_xxx
//   SEOJUICE_WEBHOOK_SECRET=whsec_xxx
//   NETLIFY_BUILD_HOOK=https://api.netlify.com/build_hooks/xxx  (optional, for SSG rebuilds)
