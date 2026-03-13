/**
 * Contentful Management API — Apply SEO changes to Contentful entries.
 *
 * Fetches approved changes from SEOJuice, resolves matching Contentful
 * entries by slug or canonical URL, applies field updates via the
 * Management API, publishes entries, and marks changes as pulled.
 *
 * Handles Contentful rate limits (429) with exponential backoff.
 *
 * Setup:
 *   1. Set SEOJUICE_API_KEY (from SEOJuice dashboard)
 *   2. Set CONTENTFUL_SPACE_ID and CONTENTFUL_MANAGEMENT_TOKEN
 *   3. Adjust CONTENT_TYPE_ID and field mappings for your content model
 */
import { SEOJuice, autoPaginate } from "seojuice";
import type { ChangeRecord, ChangeWebhookPayload } from "seojuice";
import { createClient } from "contentful-management";
import type { Entry, Environment } from "contentful-management";

const client = new SEOJuice({
  apiKey: process.env.SEOJUICE_API_KEY!,
});

const DOMAIN = "example.com";
const INTEGRATION_NAME = "contentful";
const LOCALE = "en-US";
const CONTENT_TYPE_ID = "blogPost";

// --- Contentful Management client ---

const cma = createClient({
  accessToken: process.env.CONTENTFUL_MANAGEMENT_TOKEN!,
});

async function getEnvironment(): Promise<Environment> {
  const space = await cma.getSpace(process.env.CONTENTFUL_SPACE_ID!);
  return space.getEnvironment("master");
}

// --- Rate-limit-aware request wrapper ---

async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
): Promise<T> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err: any) {
      const status = err?.status ?? err?.statusCode;
      if (status !== 429 || attempt === maxRetries) throw err;

      // Contentful returns rate limit reset in seconds
      const retryAfter = parseInt(err?.headers?.["x-contentful-ratelimit-reset"] ?? "1", 10);
      const delay = Math.max(retryAfter, 1) * 1000 * (attempt + 1);
      console.log(`[Contentful] Rate limited, retrying in ${delay}ms`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw new Error("Unreachable");
}

// --- Resolve Contentful entry by page URL ---

async function resolveEntry(
  env: Environment,
  url: string,
): Promise<Entry | null> {
  // Extract slug from URL path (e.g., "/blog/my-post" -> "my-post")
  const pathname = new URL(url).pathname;
  const slug = pathname.split("/").filter(Boolean).pop() ?? "";

  if (!slug) return null;

  // Try matching by slug field first
  const entries = await withRetry(() =>
    env.getEntries({
      content_type: CONTENT_TYPE_ID,
      "fields.slug": slug,
      limit: 1,
    }),
  );

  if (entries.items.length > 0) return entries.items[0];

  // Fallback: try matching by canonicalUrl field
  const byCanonical = await withRetry(() =>
    env.getEntries({
      content_type: CONTENT_TYPE_ID,
      "fields.canonicalUrl": url,
      limit: 1,
    }),
  );

  return byCanonical.items.length > 0 ? byCanonical.items[0] : null;
}

// --- Apply changes to Contentful entry fields ---

interface FieldUpdate {
  field: string;
  value: string;
}

function buildFieldUpdates(changes: ChangeRecord[]): FieldUpdate[] {
  const updates: FieldUpdate[] = [];

  for (const change of changes) {
    if (!change.proposed_value) continue;

    switch (change.change_type) {
      case "title_tag":
        updates.push({ field: "metaTitle", value: change.proposed_value });
        break;
      case "meta_description":
        updates.push({ field: "metaDescription", value: change.proposed_value });
        break;
      case "og_title":
        updates.push({ field: "ogTitle", value: change.proposed_value });
        break;
      case "og_description":
        updates.push({ field: "ogDescription", value: change.proposed_value });
        break;
      case "og_image":
        updates.push({ field: "ogImage", value: change.proposed_value });
        break;
      case "structured_data":
        updates.push({ field: "structuredData", value: change.proposed_value });
        break;
      // Internal links are appended separately (see applyInternalLinks)
    }
  }

  return updates;
}

function applyFieldUpdates(entry: Entry, updates: FieldUpdate[]): void {
  for (const { field, value } of updates) {
    if (!entry.fields[field]) {
      entry.fields[field] = {};
    }
    entry.fields[field][LOCALE] = value;
  }
}

function applyInternalLinks(entry: Entry, changes: ChangeRecord[]): void {
  const linkChanges = changes.filter(
    (c) => c.change_type === "internal_link" && c.proposed_value && c.anchor_text,
  );

  if (linkChanges.length === 0) return;

  // Initialize relatedLinks array if it doesn't exist
  if (!entry.fields.relatedLinks) {
    entry.fields.relatedLinks = {};
  }
  if (!entry.fields.relatedLinks[LOCALE]) {
    entry.fields.relatedLinks[LOCALE] = [];
  }

  const existing: Array<{ url: string }> = entry.fields.relatedLinks[LOCALE];

  for (const change of linkChanges) {
    // Skip if this URL is already in the list
    const alreadyLinked = existing.some((link) => link.url === change.proposed_value);
    if (alreadyLinked) continue;

    existing.push({
      url: change.proposed_value!,
      text: change.anchor_text!,
    });
  }
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

async function syncChangesToContentful() {
  console.log(`[Sync] Starting Contentful sync for ${DOMAIN}`);

  // 1. Fetch approved changes
  const changes = await fetchApprovedChanges();
  console.log(`[Sync] Found ${changes.length} approved changes`);

  if (changes.length === 0) return;

  // 2. Group by page URL
  const grouped = groupByUrl(changes);
  console.log(`[Sync] Changes span ${grouped.size} pages`);

  // 3. Get Contentful environment
  const env = await getEnvironment();

  const pulledIds: number[] = [];
  const failedIds: number[] = [];

  // 4. For each page, resolve entry and apply changes
  for (const [url, pageChanges] of grouped) {
    try {
      const entry = await resolveEntry(env, url);
      if (!entry) {
        console.warn(`[Sync] No Contentful entry found for ${url}, skipping`);
        continue;
      }

      // Build and apply field updates
      const updates = buildFieldUpdates(pageChanges);
      if (updates.length === 0 && pageChanges.every((c) => c.change_type !== "internal_link")) {
        console.log(`[Sync] No applicable changes for ${url}`);
        continue;
      }

      applyFieldUpdates(entry, updates);
      applyInternalLinks(entry, pageChanges);

      // Save and publish the entry
      const updated = await withRetry(() => entry.update());
      await withRetry(() => updated.publish());

      for (const change of pageChanges) {
        pulledIds.push(change.id);
      }

      console.log(
        `[Sync] Applied ${pageChanges.length} changes to ${url} ` +
          `(entry ${entry.sys.id})`,
      );
    } catch (err) {
      console.error(`[Sync] Failed to update Contentful for ${url}:`, err);
      for (const change of pageChanges) {
        failedIds.push(change.id);
      }
    }
  }

  // 5. Mark successfully applied changes as pulled
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
    await syncChangesToContentful();
  }
}

main().catch(console.error);

// Usage:
//   SEOJUICE_API_KEY=sk_xxx CONTENTFUL_SPACE_ID=xxx CONTENTFUL_MANAGEMENT_TOKEN=xxx \
//     npx tsx examples/changes-contentful.ts
//
//   npx tsx examples/changes-contentful.ts verify    # Verify after CDN cache clears
//
// Cron (every 15 minutes):
//   */15 * * * * cd /app && npx tsx examples/changes-contentful.ts

// --- Contentful Webhook handler (real-time trigger) ---
//
// Instead of polling on a cron, you can configure a Contentful webhook
// or a SEOJuice webhook to trigger this sync. See changes-webhook-receiver.ts
// for the full Express handler.
//
// Example: trigger sync when SEOJuice approves a change:
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
//   // Trigger Contentful sync on approval
//   if (payload.event === "change.approved") {
//     syncChangesToContentful().catch((err) =>
//       console.error("[webhook] Contentful sync failed:", err),
//     );
//   }
//
//   // Trigger verification after changes are applied
//   if (payload.event === "change.applied") {
//     verifyDeployedChanges().catch((err) =>
//       console.error("[webhook] Verification failed:", err),
//     );
//   }
// });
