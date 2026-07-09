// Illustrative integration — requires @remix-run/node: `npm i @remix-run/node`. Not type-checked in CI.
/**
 * Remix — Loader, action, and meta for applying SEO changes.
 *
 * The loader fetches changes and stats server-side via the SEOJuice SDK.
 * The action handles approve/reject/revert form submissions. The meta
 * export applies approved changes to page meta tags. A separate webhook
 * resource route handles cache invalidation.
 *
 * File structure assumed:
 *   app/routes/blog.$slug.tsx         — Page route (this file)
 *   app/routes/api.webhooks.seojuice.ts — Webhook handler (below)
 *   app/lib/seojuice.server.ts        — Shared SDK client
 */
import crypto from "node:crypto";
import { SEOJuice, autoPaginate } from "seojuice";
import type {
  ChangeRecord,
  ChangeStats,
  ChangeWebhookPayload,
} from "seojuice";

// --- Shared SDK client (app/lib/seojuice.server.ts) ---

const client = new SEOJuice({
  apiKey: process.env.SEOJUICE_API_KEY!,
});

const DOMAIN = "example.com";

// --- Types ---

interface BlogPost {
  slug: string;
  title: string;
  content: string;
  metaDescription: string;
  metaKeywords: string;
  ogTitle: string;
  ogDescription: string;
  ogImage: string;
  structuredData: string | null;
  localSchema: string | null;
  internalLinks: Array<{ anchor: string; href: string }>;
  imageAlts: Array<{ alt: string; metadata: Record<string, unknown> }>;
  accessibilityFixes: Array<{ fix: string; metadata: Record<string, unknown> }>;
  napFix: string | null;
}

interface LoaderData {
  post: BlogPost;
  changes: ChangeRecord[];
  stats: ChangeStats;
  pendingCount: number;
}

// --- CMS helpers (replace with your CMS client) ---

async function fetchPostFromCms(slug: string): Promise<BlogPost> {
  // Replace with: const post = await cms.posts.get(slug);
  return {
    slug,
    title: "Example Post",
    content: "<p>Your content here</p>",
    metaDescription: "",
    metaKeywords: "",
    ogTitle: "",
    ogDescription: "",
    ogImage: "",
    structuredData: null,
    localSchema: null,
    internalLinks: [],
    imageAlts: [],
    accessibilityFixes: [],
    napFix: null,
  };
}

// --- Apply changes to post data ---

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
      case "meta_keywords":
        updated.metaKeywords = change.proposed_value;
        break;
      case "local_schema":
        updated.localSchema = change.proposed_value;
        break;
      case "image_alt":
        // Store for rendering — apply alt text to specific images
        updated.imageAlts.push({
          alt: change.proposed_value,
          metadata: change.llm_metadata,
        });
        break;
      case "accessibility":
        // ARIA labels and focus fixes — apply in component rendering
        updated.accessibilityFixes.push({
          fix: change.proposed_value,
          metadata: change.llm_metadata,
        });
        break;
      case "nap_fix":
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

// ============================================================
// app/routes/blog.$slug.tsx — Loader
// ============================================================
//
// Fetches CMS content and SEOJuice changes in parallel. Changes
// with status "applied" are merged into the post data so they
// appear in the rendered page and meta tags.

async function loader({ params }: { params: { slug: string } }) {
  const slug = params.slug;
  const pageUrl = `https://${DOMAIN}/blog/${slug}`;

  const [post, changesResult, stats] = await Promise.all([
    fetchPostFromCms(slug),
    client.changes.list(DOMAIN, { status: "applied", url: pageUrl }),
    client.changes.stats(DOMAIN),
  ]);

  // Also fetch pending changes so the admin bar can show the count
  const pendingResult = await client.changes.list(DOMAIN, {
    status: "pending",
    url: pageUrl,
  });

  const enhanced =
    changesResult.results.length > 0
      ? applyChanges(post, changesResult.results)
      : post;

  const data: LoaderData = {
    post: enhanced,
    changes: [...changesResult.results, ...pendingResult.results],
    stats,
    pendingCount: pendingResult.pagination.total_count,
  };

  // Return with cache headers — revalidate via webhook
  return new Response(JSON.stringify(data), {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=60, s-maxage=3600",
    },
  });
}

// ============================================================
// app/routes/blog.$slug.tsx — Action
// ============================================================
//
// Handles form submissions for approve, reject, and revert.
// The form includes a hidden `_action` field to discriminate.

async function action({ request }: { request: Request }) {
  const formData = await request.formData();
  const actionType = formData.get("_action") as string;
  const changeId = Number(formData.get("changeId"));
  const reason = (formData.get("reason") as string) || undefined;

  if (!changeId || isNaN(changeId)) {
    return new Response(
      JSON.stringify({ error: "Invalid change ID" }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  try {
    switch (actionType) {
      case "approve":
        await client.changes.approve(DOMAIN, changeId);
        break;
      case "reject":
        await client.changes.reject(DOMAIN, changeId, { reason });
        break;
      case "revert":
        await client.changes.revert(DOMAIN, changeId, { reason });
        break;
      default:
        return new Response(
          JSON.stringify({ error: `Unknown action: ${actionType}` }),
          { status: 400, headers: { "Content-Type": "application/json" } },
        );
    }

    // Redirect back to the page — Remix will re-run the loader
    return new Response(null, {
      status: 302,
      headers: { Location: `/blog/${formData.get("slug")}` },
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Action failed";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
}

// ============================================================
// app/routes/blog.$slug.tsx — Meta
// ============================================================
//
// Remix's meta export applies SEO changes to the page's <head>.
// The loader already merged applied changes into post data, so
// meta just reads from the enhanced post.

interface MetaArgs {
  data: LoaderData;
}

function meta({ data }: MetaArgs) {
  if (!data?.post) return [{ title: "Not Found" }];

  const { post } = data;
  const tags: Array<Record<string, string>> = [
    { title: post.title },
  ];

  if (post.metaDescription) {
    tags.push({ name: "description", content: post.metaDescription });
  }
  if (post.ogTitle) {
    tags.push({ property: "og:title", content: post.ogTitle });
  }
  if (post.ogDescription) {
    tags.push({ property: "og:description", content: post.ogDescription });
  }
  if (post.ogImage) {
    tags.push({ property: "og:image", content: post.ogImage });
  }

  return tags;
}

// ============================================================
// app/routes/blog.$slug.tsx — Page component (Remix JSX)
// ============================================================
//
// Renders the blog post with an admin bar for pending changes.
// Content is rendered via the CMS — ensure your CMS sanitizes
// HTML before storing it.
//
// export default function BlogPost() {
//   const { post, changes, pendingCount } = useLoaderData<LoaderData>();
//   const navigation = useNavigation();
//   const isSubmitting = navigation.state === "submitting";
//
//   return (
//     <>
//       {/* Structured data injection */}
//       {post.structuredData && (
//         <script type="application/ld+json">
//           {post.structuredData}
//         </script>
//       )}
//
//       {/* Admin bar: pending changes count + quick actions */}
//       {pendingCount > 0 && (
//         <div className="admin-bar">
//           <span>{pendingCount} pending SEO changes for this page</span>
//           {changes
//             .filter((c) => c.status === "pending")
//             .map((change) => (
//               <Form method="post" key={change.id} className="inline-form">
//                 <input type="hidden" name="_action" value="approve" />
//                 <input type="hidden" name="changeId" value={change.id} />
//                 <input type="hidden" name="slug" value={post.slug} />
//                 <span className="change-summary">
//                   {change.change_type}: {truncate(change.proposed_value, 40)}
//                 </span>
//                 <button type="submit" disabled={isSubmitting}>
//                   Approve
//                 </button>
//               </Form>
//             ))}
//         </div>
//       )}
//
//       <article>
//         <h1>{post.title}</h1>
//         {/* Render CMS content — ensure your CMS sanitizes HTML */}
//         <div>{post.content}</div>
//       </article>
//
//       {/* Internal link suggestions */}
//       {post.internalLinks.length > 0 && (
//         <nav aria-label="Related articles">
//           <h2>Related Articles</h2>
//           <ul>
//             {post.internalLinks.map((link, i) => (
//               <li key={i}>
//                 <a href={link.href}>{link.anchor}</a>
//               </li>
//             ))}
//           </ul>
//         </nav>
//       )}
//     </>
//   );
// }

// ============================================================
// app/routes/api.webhooks.seojuice.ts — Webhook resource route
// ============================================================
//
// Verifies HMAC signature and triggers cache invalidation via
// Remix's built-in cache purging or by calling your CDN API.

const WEBHOOK_SECRET = process.env.SEOJUICE_WEBHOOK_SECRET!;
const INTEGRATION_NAME = "remix-app";

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

async function webhookAction({ request }: { request: Request }) {
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

  // Handle change events — purge cache for the affected URL
  if (
    payload.event === "change.applied" ||
    payload.event === "change.reverted"
  ) {
    const pageUrl = payload.change.page_url;
    if (pageUrl) {
      try {
        const urlPath = new URL(pageUrl).pathname;
        // Purge CDN cache for this path:
        // await fetch("https://api.your-cdn.com/purge", {
        //   method: "POST",
        //   body: JSON.stringify({ paths: [urlPath] }),
        // });
        console.log(`[webhook] Purged cache for ${urlPath}`);
      } catch (err) {
        console.error(`[webhook] Cache purge failed:`, err);
      }
    }
  }

  // After deploy: verify all pulled changes
  if (payload.event === "change.applied") {
    const pulled: number[] = [];
    for await (const change of autoPaginate((params) =>
      client.changes.list(DOMAIN, { ...params, status: "pulled" }),
    )) {
      if (change.pulled_by_integration === INTEGRATION_NAME) {
        pulled.push(change.id);
      }
    }

    if (pulled.length > 0) {
      await client.changes
        .bulk(DOMAIN, {
          action: "verify",
          ids: pulled,
          integration: INTEGRATION_NAME,
        })
        .catch((err) =>
          console.error(`[webhook] Verification failed:`, err),
        );
    }
  }

  return new Response(
    JSON.stringify({ received: true }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  );
}

// --- Helpers ---

function truncate(value: string | null, max: number): string {
  if (!value) return "(empty)";
  return value.length > max ? value.slice(0, max) + "..." : value;
}

// --- Exports ---

export { loader, action, meta, webhookAction };
export type { LoaderData, BlogPost };

// Usage:
//
//   // app/routes/blog.$slug.tsx
//   export { loader, action, meta } from "~/lib/changes-remix";
//   // ... then define your default component using useLoaderData<LoaderData>()
//
//   // app/routes/api.webhooks.seojuice.ts
//   export { webhookAction as action } from "~/lib/changes-remix";
//
// Environment variables:
//   SEOJUICE_API_KEY=sk_xxx
//   SEOJUICE_WEBHOOK_SECRET=whsec_xxx
//
// Form submission example (from your component):
//
//   <Form method="post">
//     <input type="hidden" name="_action" value="approve" />
//     <input type="hidden" name="changeId" value={change.id} />
//     <input type="hidden" name="slug" value={post.slug} />
//     <button type="submit">Approve</button>
//   </Form>
//
//   <Form method="post">
//     <input type="hidden" name="_action" value="reject" />
//     <input type="hidden" name="changeId" value={change.id} />
//     <input type="hidden" name="slug" value={post.slug} />
//     <input type="text" name="reason" placeholder="Reason (optional)" />
//     <button type="submit">Reject</button>
//   </Form>
