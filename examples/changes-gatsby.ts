/**
 * Gatsby Integration — Apply SEO changes during Gatsby builds.
 *
 * Fetches approved changes from SEOJuice and creates Gatsby source
 * nodes so they're queryable via GraphQL. During `createPages`, changes
 * are merged into page context for each CMS page. After build, changes
 * are marked as pulled via `onPostBuild`.
 *
 * Add this to your `gatsby-node.ts` and restart the dev server.
 *
 * Requires: gatsby, gatsby-plugin-react-helmet
 */
import { SEOJuice, autoPaginate } from "seojuice";
import type { ChangeRecord } from "seojuice";
import type { GatsbyNode, CreatePagesArgs, SourceNodesArgs } from "gatsby";

const client = new SEOJuice({
  apiKey: process.env.SEOJUICE_API_KEY!,
});

const DOMAIN = "example.com";
const INTEGRATION_NAME = "gatsby";

// --- Types ---

interface CmsPage {
  slug: string;
  path: string;
  title: string;
  metaDescription: string;
  ogTitle: string;
  ogDescription: string;
  ogImage: string;
  structuredData: string | null;
  content: string;
}

interface SeoPageContext extends CmsPage {
  internalLinks: Array<{ anchor: string; href: string }>;
}

// --- Track pulled change IDs across build phases ---

const pulledChangeIds: number[] = [];

// --- sourceNodes: Create Gatsby nodes from SEOJuice changes ---

export const sourceNodes: GatsbyNode["sourceNodes"] = async ({
  actions,
  createContentDigest,
  createNodeId,
}: SourceNodesArgs) => {
  const { createNode } = actions;

  console.log(`[SEOJuice] Fetching approved changes for ${DOMAIN}`);

  let count = 0;
  for await (const change of autoPaginate((params) =>
    client.changes.list(DOMAIN, { ...params, status: "approved" }),
  )) {
    createNode({
      ...change,
      id: createNodeId(`seojuice-change-${change.id}`),
      seojuice_id: change.id,
      internal: {
        type: "SeojuiceChange",
        contentDigest: createContentDigest(change),
      },
    });
    count++;
  }

  console.log(`[SEOJuice] Created ${count} SeojuiceChange nodes`);
};

// --- createPages: Merge changes into page context ---

export const createPages: GatsbyNode["createPages"] = async ({
  graphql,
  actions,
}: CreatePagesArgs) => {
  const { createPage } = actions;

  // Query CMS pages and SEOJuice changes together
  const result = await graphql<{
    allCmsPage: { nodes: CmsPage[] };
    allSeojuiceChange: { nodes: Array<ChangeRecord & { seojuice_id: number }> };
  }>(`
    {
      allCmsPage {
        nodes {
          slug
          path
          title
          metaDescription
          ogTitle
          ogDescription
          ogImage
          structuredData
          content
        }
      }
      allSeojuiceChange {
        nodes {
          seojuice_id
          change_type
          proposed_value
          previous_value
          anchor_text
          page_url
          status
        }
      }
    }
  `);

  if (result.errors) {
    console.error("[SEOJuice] GraphQL query failed:", result.errors);
    return;
  }

  const pages = result.data?.allCmsPage.nodes ?? [];
  const changes = result.data?.allSeojuiceChange.nodes ?? [];

  // Group changes by page URL
  const changesByUrl = new Map<string, typeof changes>();
  for (const change of changes) {
    const url = change.page_url ?? "unknown";
    const existing = changesByUrl.get(url) ?? [];
    existing.push(change);
    changesByUrl.set(url, existing);
  }

  for (const page of pages) {
    const pageUrl = `https://${DOMAIN}${page.path}`;
    const pageChanges = changesByUrl.get(pageUrl) ?? [];

    const context = applyChangesToPageContext(page, pageChanges);

    // Track IDs so we can mark them as pulled in onPostBuild
    for (const change of pageChanges) {
      pulledChangeIds.push(change.seojuice_id);
    }

    createPage({
      path: page.path,
      component: "./src/templates/page.tsx",
      context,
    });
  }

  console.log(
    `[SEOJuice] Created ${pages.length} pages, ` +
      `${pulledChangeIds.length} changes applied`,
  );
};

// --- Apply changes to page context ---

function applyChangesToPageContext(
  page: CmsPage,
  changes: Array<ChangeRecord & { seojuice_id: number }>,
): SeoPageContext {
  const context: SeoPageContext = {
    ...page,
    internalLinks: [],
  };

  for (const change of changes) {
    if (!change.proposed_value) continue;

    switch (change.change_type) {
      case "title_tag":
        context.title = change.proposed_value;
        break;
      case "meta_description":
        context.metaDescription = change.proposed_value;
        break;
      case "og_title":
        context.ogTitle = change.proposed_value;
        break;
      case "og_description":
        context.ogDescription = change.proposed_value;
        break;
      case "og_image":
        context.ogImage = change.proposed_value;
        break;
      case "structured_data":
        context.structuredData = change.proposed_value;
        break;
      case "internal_link":
        if (change.anchor_text && change.proposed_value) {
          context.internalLinks.push({
            anchor: change.anchor_text,
            href: change.proposed_value,
          });
        }
        break;
    }
  }

  return context;
}

// --- onPostBuild: Mark applied changes as pulled ---

export const onPostBuild: GatsbyNode["onPostBuild"] = async () => {
  if (pulledChangeIds.length === 0) {
    console.log("[SEOJuice] No changes to mark as pulled");
    return;
  }

  try {
    const result = await client.changes.bulk(DOMAIN, {
      action: "pull",
      ids: pulledChangeIds,
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
};

// --- Post-deploy verification script ---
// Run this after your Gatsby site deploys (e.g., in CI/CD).

async function verifyDeployedChanges() {
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

// --- Run verification directly ---

if (process.argv[2] === "verify") {
  verifyDeployedChanges().catch(console.error);
}

// --- GraphQL query for page templates ---
//
// Use this in your page template to access SEOJuice changes:
//
// export const query = graphql`
//   query PageQuery($slug: String!) {
//     cmsPage(slug: { eq: $slug }) {
//       title
//       content
//       metaDescription
//     }
//     allSeojuiceChange(filter: { page_url: { eq: $pageUrl } }) {
//       nodes {
//         change_type
//         proposed_value
//         anchor_text
//       }
//     }
//   }
// `;

// --- Page template component (using gatsby-plugin-react-helmet) ---
//
// import React from "react";
// import { Helmet } from "react-helmet";
// import { graphql } from "gatsby";
//
// interface PageTemplateProps {
//   pageContext: SeoPageContext;
// }
//
// export default function PageTemplate({ pageContext }: PageTemplateProps) {
//   const {
//     title,
//     metaDescription,
//     ogTitle,
//     ogDescription,
//     ogImage,
//     structuredData,
//     content,
//     internalLinks,
//   } = pageContext;
//
//   return (
//     <>
//       <Helmet>
//         <title>{title}</title>
//         {metaDescription && (
//           <meta name="description" content={metaDescription} />
//         )}
//         {ogTitle && <meta property="og:title" content={ogTitle} />}
//         {ogDescription && (
//           <meta property="og:description" content={ogDescription} />
//         )}
//         {ogImage && <meta property="og:image" content={ogImage} />}
//         {structuredData && (
//           <script type="application/ld+json">{structuredData}</script>
//         )}
//       </Helmet>
//
//       <article>
//         <h1>{title}</h1>
//         <div>{content}</div>
//       </article>
//
//       {internalLinks.length > 0 && (
//         <nav aria-label="Related articles">
//           <h2>Related Articles</h2>
//           <ul>
//             {internalLinks.map((link, i) => (
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

// --- Trigger Gatsby Cloud rebuild via webhook ---
//
// When SEOJuice detects new changes, trigger a Gatsby Cloud rebuild:
//
// async function triggerGatsbyCloudBuild() {
//   const webhookUrl = process.env.GATSBY_CLOUD_BUILD_WEBHOOK!;
//   const response = await fetch(webhookUrl, { method: "POST" });
//
//   if (response.ok) {
//     console.log("[Gatsby Cloud] Build triggered");
//   } else {
//     console.error(
//       `[Gatsby Cloud] Failed to trigger build: ${response.status}`,
//     );
//   }
// }
//
// // Set GATSBY_CLOUD_BUILD_WEBHOOK in your SEOJuice webhook settings
// // to trigger rebuilds automatically on change.approved events.

// Usage:
//   1. Copy sourceNodes, createPages, onPostBuild to your gatsby-node.ts
//   2. Set SEOJUICE_API_KEY in your environment
//   3. gatsby build (changes are fetched, applied, and marked as pulled)
//   4. After deploy: npx tsx examples/changes-gatsby.ts verify
//
// Gatsby Cloud:
//   Set your SEOJuice webhook URL to your Gatsby Cloud build webhook
//   to trigger rebuilds when new changes are approved.
