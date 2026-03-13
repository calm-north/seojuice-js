/**
 * Headless CMS Auto-Apply — Sync SEO changes to your CMS.
 *
 * Fetches pending and approved changes from SEOJuice, groups them
 * by page URL, applies them to CMS content via API, and marks them
 * as pulled/verified. Designed to run as a cron job or be triggered
 * by a webhook.
 *
 * Replace the CMS API calls with your actual CMS client (Contentful,
 * Sanity, Strapi, Payload, etc.).
 */
import { SEOJuice, autoPaginate } from "seojuice";
import type { ChangeRecord } from "seojuice";

const client = new SEOJuice({
  apiKey: process.env.SEOJUICE_API_KEY!,
});

const DOMAIN = "example.com";
const INTEGRATION_NAME = "headless-cms-sync";

// --- CMS helpers (replace with your actual CMS client) ---

interface CmsEntry {
  id: string;
  slug: string;
  title: string;
  metaDescription: string;
  metaKeywords: string;
  ogTitle: string;
  ogDescription: string;
  ogImage: string;
  structuredData: string | null;
  localSchema: string | null;
  images: Array<{ src: string; alt: string }>;
  ariaLabels: Record<string, string>;
  napData: { name: string; address: string; phone: string } | null;
  internalLinks: Array<{ url: string; text: string }>;
}

async function cmsGetEntryByUrl(url: string): Promise<CmsEntry | null> {
  // Example: const entry = await cmsClient.entries.get({ slug: new URL(url).pathname });
  console.log(`[CMS] Fetching entry for ${url}`);
  return null; // Replace with real implementation
}

async function cmsUpdateEntry(
  entryId: string,
  fields: Partial<CmsEntry>,
): Promise<void> {
  // Example: await cmsClient.entries.update(entryId, { fields });
  console.log(`[CMS] Updating entry ${entryId}:`, Object.keys(fields));
}

// --- Change application logic ---

function buildCmsUpdate(changes: ChangeRecord[]): Partial<CmsEntry> {
  const update: Partial<CmsEntry> = {};

  for (const change of changes) {
    if (!change.proposed_value) continue;

    switch (change.change_type) {
      case "title_tag":
        update.title = change.proposed_value;
        break;
      case "meta_description":
        update.metaDescription = change.proposed_value;
        break;
      case "meta_keywords":
        update.metaKeywords = change.proposed_value;
        break;
      case "og_title":
        update.ogTitle = change.proposed_value;
        break;
      case "og_description":
        update.ogDescription = change.proposed_value;
        break;
      case "og_image":
        update.ogImage = change.proposed_value;
        break;
      case "structured_data":
        update.structuredData = change.proposed_value;
        break;
      case "local_schema":
        // Local Business schema — stored alongside structured data
        update.localSchema = change.proposed_value;
        break;
      case "image_alt":
        // Image alt text — update the specific image in the CMS
        // change.proposed_value contains the new alt text
        // The image can be identified from the change's llm_metadata
        break;
      case "accessibility":
        // Accessibility fix — ARIA labels, focus fixes, skip nav
        // Typically handled at render time by the SEOJuice JS loader,
        // but headless CMS users can apply to their components
        break;
      case "nap_fix":
        // NAP consistency — Name, Address, Phone correction
        // Apply to business info fields or structured data
        break;
      case "internal_link":
        // Internal links — append to the page's related links
        if (change.anchor_text) {
          if (!update.internalLinks) update.internalLinks = [];
          update.internalLinks.push({
            url: change.proposed_value,
            text: change.anchor_text,
          });
        }
        break;
    }
  }

  return update;
}

// --- Fetch all actionable changes ---

async function fetchActionableChanges(): Promise<ChangeRecord[]> {
  const changes: ChangeRecord[] = [];

  // Fetch approved changes (ready to be applied)
  for await (const change of autoPaginate((params) =>
    client.changes.list(DOMAIN, { ...params, status: "approved" }),
  )) {
    changes.push(change);
  }

  // Also fetch applied changes that haven't been pulled yet
  for await (const change of autoPaginate((params) =>
    client.changes.list(DOMAIN, { ...params, status: "applied" }),
  )) {
    if (!change.pulled_at) {
      changes.push(change);
    }
  }

  return changes;
}

// --- Group changes by page URL ---

function groupByUrl(
  changes: ChangeRecord[],
): Map<string, ChangeRecord[]> {
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

async function syncChangesToCms() {
  console.log(`[Sync] Starting CMS sync for ${DOMAIN}`);

  // 1. Fetch all actionable changes
  const changes = await fetchActionableChanges();
  console.log(`[Sync] Found ${changes.length} changes to process`);

  if (changes.length === 0) return;

  // 2. Group by page URL
  const grouped = groupByUrl(changes);
  console.log(`[Sync] Changes span ${grouped.size} pages`);

  const pulledIds: number[] = [];
  const failedIds: number[] = [];

  // 3. For each page, apply changes to CMS
  for (const [url, pageChanges] of grouped) {
    try {
      const entry = await cmsGetEntryByUrl(url);
      if (!entry) {
        console.warn(`[Sync] No CMS entry found for ${url}, skipping`);
        continue;
      }

      const update = buildCmsUpdate(pageChanges);
      if (Object.keys(update).length === 0) {
        console.log(`[Sync] No CMS-applicable changes for ${url}`);
        continue;
      }

      // Apply to CMS
      await cmsUpdateEntry(entry.id, update);

      // Only mark as pulled if the CMS update succeeded
      for (const change of pageChanges) {
        pulledIds.push(change.id);
      }

      console.log(
        `[Sync] Applied ${pageChanges.length} changes to ${url}`,
      );
    } catch (err) {
      console.error(`[Sync] Failed to update CMS for ${url}:`, err);
      for (const change of pageChanges) {
        failedIds.push(change.id);
      }
      // Don't mark as pulled — SEOJuice will retry on next sync
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
// Call this after your CMS publishes / CDN cache clears.

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
    await syncChangesToCms();
  }
}

main().catch(console.error);

// Usage:
//   npx tsx examples/changes-headless-cms.ts          # Sync changes to CMS
//   npx tsx examples/changes-headless-cms.ts verify    # Verify after deploy
//
// Cron (every 15 minutes):
//   */15 * * * * cd /app && npx tsx examples/changes-headless-cms.ts
//
// Or trigger from a webhook handler — see changes-webhook-receiver.ts
