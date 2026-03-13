/**
 * Sanity CMS — Apply SEO changes via GROQ queries and patch transactions.
 *
 * Fetches approved changes from SEOJuice, resolves matching Sanity
 * documents by slug, builds a patch transaction to update SEO fields,
 * commits the transaction, and marks changes as pulled.
 *
 * Setup:
 *   1. Set SEOJUICE_API_KEY (from SEOJuice dashboard)
 *   2. Set SANITY_PROJECT_ID, SANITY_DATASET, and SANITY_TOKEN (with write access)
 *   3. Adjust DOCUMENT_TYPE and field paths for your schema
 */
import { SEOJuice, autoPaginate } from "seojuice";
import type { ChangeRecord, ChangeWebhookPayload } from "seojuice";
import { createClient } from "@sanity/client";
import type { SanityClient, Transaction } from "@sanity/client";

const client = new SEOJuice({
  apiKey: process.env.SEOJUICE_API_KEY!,
});

const DOMAIN = "example.com";
const INTEGRATION_NAME = "sanity";
const DOCUMENT_TYPE = "post";

// --- Sanity client (with token for mutations) ---

const sanity: SanityClient = createClient({
  projectId: process.env.SANITY_PROJECT_ID!,
  dataset: process.env.SANITY_DATASET ?? "production",
  token: process.env.SANITY_TOKEN!,
  apiVersion: "2024-01-01",
  useCdn: false, // Mutations require the API, not the CDN
});

// --- Resolve Sanity document by page URL ---

interface SanityDocument {
  _id: string;
  _type: string;
  slug: { current: string };
  seo?: {
    metaTitle?: string;
    metaDescription?: string;
    ogTitle?: string;
    ogDescription?: string;
    ogImage?: string;
    structuredData?: string;
  };
  relatedLinks?: Array<{ _type: string; url: string; text: string; _key: string }>;
}

async function resolveDocument(url: string): Promise<SanityDocument | null> {
  const pathname = new URL(url).pathname;
  const slug = pathname.split("/").filter(Boolean).pop() ?? "";

  if (!slug) return null;

  const doc = await sanity.fetch<SanityDocument | null>(
    `*[_type == $type && slug.current == $slug][0]`,
    { type: DOCUMENT_TYPE, slug },
  );

  return doc;
}

// --- Build Sanity patch for SEO field changes ---

interface SeoFieldPatch {
  [path: string]: string;
}

function buildSeoPatch(changes: ChangeRecord[]): SeoFieldPatch {
  const patch: SeoFieldPatch = {};

  for (const change of changes) {
    if (!change.proposed_value) continue;

    switch (change.change_type) {
      case "title_tag":
        patch["seo.metaTitle"] = change.proposed_value;
        break;
      case "meta_description":
        patch["seo.metaDescription"] = change.proposed_value;
        break;
      case "og_title":
        patch["seo.ogTitle"] = change.proposed_value;
        break;
      case "og_description":
        patch["seo.ogDescription"] = change.proposed_value;
        break;
      case "og_image":
        patch["seo.ogImage"] = change.proposed_value;
        break;
      case "structured_data":
        patch["seo.structuredData"] = change.proposed_value;
        break;
    }
  }

  return patch;
}

// --- Build internal link append operations ---

interface LinkItem {
  _type: string;
  _key: string;
  url: string;
  text: string;
}

function buildLinkItems(
  changes: ChangeRecord[],
  existingLinks: LinkItem[],
): LinkItem[] {
  const newLinks: LinkItem[] = [];
  const existingUrls = new Set(existingLinks.map((l) => l.url));

  for (const change of changes) {
    if (change.change_type !== "internal_link") continue;
    if (!change.proposed_value || !change.anchor_text) continue;
    if (existingUrls.has(change.proposed_value)) continue;

    newLinks.push({
      _type: "link",
      _key: crypto.randomUUID().slice(0, 12),
      url: change.proposed_value,
      text: change.anchor_text,
    });
  }

  return newLinks;
}

// --- Apply changes to a single document via transaction ---

function applyToTransaction(
  transaction: Transaction,
  doc: SanityDocument,
  changes: ChangeRecord[],
): boolean {
  const seoPatch = buildSeoPatch(changes);
  const newLinks = buildLinkItems(changes, doc.relatedLinks ?? []);

  const hasFieldUpdates = Object.keys(seoPatch).length > 0;
  const hasLinkUpdates = newLinks.length > 0;

  if (!hasFieldUpdates && !hasLinkUpdates) return false;

  // Apply SEO field updates
  if (hasFieldUpdates) {
    transaction.patch(doc._id, (p) => p.set(seoPatch));
  }

  // Append new internal links
  if (hasLinkUpdates) {
    transaction.patch(doc._id, (p) =>
      p.setIfMissing({ relatedLinks: [] }).append("relatedLinks", newLinks),
    );
  }

  return true;
}

// --- Fetch all approved changes ---

async function fetchApprovedChanges(): Promise<ChangeRecord[]> {
  const changes: ChangeRecord[] = [];

  for await (const change of autoPaginate((params) =>
    client.changes.list(DOMAIN, { ...params, status: "approved" }),
  )) {
    changes.push(change);
  }

  return changes;
}

// --- Group changes by page URL ---

function groupByUrl(changes: ChangeRecord[]): Map<string, ChangeRecord[]> {
  const grouped = new Map<string, ChangeRecord[]>();

  for (const change of changes) {
    const url = change.page_url ?? "unknown";
    const existing = grouped.get(url) ?? [];
    existing.push(change);
    grouped.set(url, existing);
  }

  return grouped;
}

// --- Main sync workflow ---

async function syncChangesToSanity() {
  console.log(`[Sync] Starting Sanity sync for ${DOMAIN}`);

  // 1. Fetch approved changes
  const changes = await fetchApprovedChanges();
  console.log(`[Sync] Found ${changes.length} approved changes`);

  if (changes.length === 0) return;

  // 2. Group by page URL
  const grouped = groupByUrl(changes);
  console.log(`[Sync] Changes span ${grouped.size} pages`);

  const pulledIds: number[] = [];
  const failedIds: number[] = [];

  // 3. Process each page: resolve document, build transaction, commit
  for (const [url, pageChanges] of grouped) {
    try {
      const doc = await resolveDocument(url);
      if (!doc) {
        console.warn(`[Sync] No Sanity document found for ${url}, skipping`);
        continue;
      }

      // Build a transaction for all changes on this document
      const transaction = sanity.transaction();
      const hasUpdates = applyToTransaction(transaction, doc, pageChanges);

      if (!hasUpdates) {
        console.log(`[Sync] No applicable changes for ${url}`);
        continue;
      }

      // Commit the transaction
      await transaction.commit({ autoGenerateArrayKeys: false });

      for (const change of pageChanges) {
        pulledIds.push(change.id);
      }

      console.log(
        `[Sync] Applied ${pageChanges.length} changes to ${url} ` +
          `(doc ${doc._id})`,
      );
    } catch (err) {
      console.error(`[Sync] Failed to update Sanity for ${url}:`, err);
      for (const change of pageChanges) {
        failedIds.push(change.id);
      }
    }
  }

  // 4. Mark successfully applied changes as pulled
  if (pulledIds.length > 0) {
    const result = await client.changes.bulk(DOMAIN, {
      action: "pull",
      ids: pulledIds,
      integration: INTEGRATION_NAME,
    });
    console.log(
      `[Sync] Marked ${result.total_succeeded} changes as pulled` +
        (result.total_failed > 0
          ? `, ${result.total_failed} failed`
          : ""),
    );
  }

  console.log(
    `[Sync] Done. Pulled: ${pulledIds.length}, Failed: ${failedIds.length}`,
  );
}

// --- Post-deploy verification ---

async function verifyDeployedChanges() {
  console.log(`[Verify] Checking for pulled changes to verify`);

  const pulled: ChangeRecord[] = [];
  for await (const change of autoPaginate((params) =>
    client.changes.list(DOMAIN, { ...params, status: "pulled" }),
  )) {
    if (change.pulled_by_integration === INTEGRATION_NAME) {
      pulled.push(change);
    }
  }

  if (pulled.length === 0) {
    console.log("[Verify] No changes to verify");
    return;
  }

  const result = await client.changes.bulk(DOMAIN, {
    action: "verify",
    ids: pulled.map((c) => c.id),
    integration: INTEGRATION_NAME,
  });

  console.log(
    `[Verify] Verified ${result.total_succeeded} changes` +
      (result.total_failed > 0
        ? `, ${result.total_failed} failed`
        : ""),
  );
}

// --- Entry point ---

async function main() {
  const mode = process.argv[2] ?? "sync";

  if (mode === "verify") {
    await verifyDeployedChanges();
  } else {
    await syncChangesToSanity();
  }
}

main().catch(console.error);

// Usage:
//   SEOJUICE_API_KEY=sk_xxx SANITY_PROJECT_ID=xxx SANITY_DATASET=production SANITY_TOKEN=xxx \
//     npx tsx examples/changes-sanity.ts
//
//   npx tsx examples/changes-sanity.ts verify    # Verify after deploy
//
// Cron (every 15 minutes):
//   */15 * * * * cd /app && npx tsx examples/changes-sanity.ts

// --- Sanity Webhook handler (real-time trigger) ---
//
// Sanity can fire webhooks on document publish. You can also use a
// SEOJuice webhook to trigger sync when changes are approved.
//
// Option A: Trigger from SEOJuice webhook (recommended)
// Configure in SEOJuice dashboard -> Webhooks -> Add endpoint
// See changes-webhook-receiver.ts for the full Express handler.
//
// import crypto from "node:crypto";
// import express from "express";
//
// const WEBHOOK_SECRET = process.env.SEOJUICE_WEBHOOK_SECRET!;
//
// app.post("/webhooks/seojuice", express.raw({ type: "application/json" }), (req, res) => {
//   const rawBody = req.body.toString();
//   const signature = req.headers["x-seojuice-signature"] as string | undefined;
//
//   if (!signature) { res.status(401).json({ error: "Missing signature" }); return; }
//
//   const expected = crypto.createHmac("sha256", WEBHOOK_SECRET).update(rawBody).digest("hex");
//   if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
//     res.status(401).json({ error: "Invalid signature" }); return;
//   }
//
//   const payload: ChangeWebhookPayload = JSON.parse(rawBody);
//   res.status(200).json({ received: true });
//
//   if (payload.event === "change.approved") {
//     syncChangesToSanity().catch((err) =>
//       console.error("[webhook] Sanity sync failed:", err),
//     );
//   }
//
//   if (payload.event === "change.applied") {
//     verifyDeployedChanges().catch((err) =>
//       console.error("[webhook] Verification failed:", err),
//     );
//   }
// });
//
// Option B: Trigger verification from Sanity's own webhook
// When a document is published in Sanity, it can call your endpoint
// to trigger verification of pulled changes for that document.
//
// app.post("/webhooks/sanity-publish", express.json(), async (req, res) => {
//   const { _id, slug } = req.body;
//   console.log(`[sanity-webhook] Document ${_id} published (slug: ${slug?.current})`);
//
//   // After Sanity publishes, verify that pulled changes are now live
//   await verifyDeployedChanges().catch((err) =>
//     console.error("[sanity-webhook] Verification failed:", err),
//   );
//
//   res.status(200).json({ received: true });
// });
