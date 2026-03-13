/**
 * Change Management — Programmatic review and automation workflows.
 *
 * Shows how to triage changes by type, bulk-approve changes,
 * review and reject specific ones, configure automation settings, and
 * revert changes that caused problems.
 */
import { SEOJuice, autoPaginate } from "seojuice";
import type {
  ChangeRecord,
  ChangeStats,
  ChangeSettings,
} from "seojuice";
import { ChangeStatus } from "seojuice";

const client = new SEOJuice({
  apiKey: process.env.SEOJUICE_API_KEY!,
});

const DOMAIN = "example.com";

// --- Stats overview ---

async function printStats(): Promise<ChangeStats> {
  const stats = await client.changes.stats(DOMAIN);

  console.log("=== Change Stats ===");
  console.log("By status:", stats.by_status);
  console.log("By type:", stats.by_type);

  const pending = stats.by_status[ChangeStatus.Pending] ?? 0;
  const applied = stats.by_status[ChangeStatus.Applied] ?? 0;
  console.log(`\nPending review: ${pending}, Live on site: ${applied}`);

  return stats;
}

// --- Fetch pending changes grouped by type ---

interface TriagedChanges {
  autoApprovable: ChangeRecord[];
  needsReview: ChangeRecord[];
}

// Change types that are generally safe to auto-approve
const AUTO_APPROVE_TYPES = new Set([
  "meta_description",
  "og_title",
  "og_description",
  "og_image",
  "image_alt",
  "structured_data",
]);

async function triagePendingChanges(): Promise<TriagedChanges> {
  const triage: TriagedChanges = { autoApprovable: [], needsReview: [] };

  for await (const change of autoPaginate((params) =>
    client.changes.list(DOMAIN, {
      ...params,
      status: ChangeStatus.Pending,
    }),
  )) {
    if (AUTO_APPROVE_TYPES.has(change.change_type)) {
      triage.autoApprovable.push(change);
    } else {
      triage.needsReview.push(change);
    }
  }

  console.log(
    `\nTriaged: ${triage.autoApprovable.length} auto-approvable, ` +
      `${triage.needsReview.length} need review`,
  );

  return triage;
}

// --- Bulk-approve changes ---

async function bulkApprove(
  changes: ChangeRecord[],
  label: string,
): Promise<void> {
  if (changes.length === 0) return;

  const ids = changes.map((c) => c.id);
  const result = await client.changes.bulk(DOMAIN, {
    action: "approve",
    ids,
  });

  console.log(
    `[${label}] Approved ${result.total_succeeded}/${ids.length}` +
      (result.total_failed > 0
        ? ` (${result.total_failed} failed)`
        : ""),
  );

  // Log any failures for investigation
  for (const failure of result.failed) {
    console.warn(`  Change #${failure.id}: ${failure.error}`);
  }
}

// --- Review individual changes that need manual attention ---

async function reviewChanges(
  changes: ChangeRecord[],
): Promise<void> {
  for (const change of changes) {
    console.log(`\n--- Change #${change.id} ---`);
    console.log(`  Type: ${change.change_type}`);
    console.log(`  Page: ${change.page_url}`);
    console.log(`  Confidence: ${change.confidence_score}`);
    console.log(`  Reason: ${change.reason}`);
    console.log(`  Current: ${truncate(change.previous_value, 80)}`);
    console.log(`  Proposed: ${truncate(change.proposed_value, 80)}`);

    if (change.potential_risks.length > 0) {
      console.log(`  Risks: ${JSON.stringify(change.potential_risks)}`);
    }

    // Example: reject title tag changes with low confidence
    if (
      change.change_type === "title_tag" &&
      (change.confidence_score ?? 0) < 0.7
    ) {
      await client.changes.reject(DOMAIN, change.id, {
        reason: "Low confidence title change — needs manual review",
      });
      console.log(`  -> Rejected (low confidence title)`);
    }
  }
}

// --- Revert a problematic change ---

async function revertChange(
  changeId: number,
  reason: string,
): Promise<void> {
  const reverted = await client.changes.revert(DOMAIN, changeId, {
    reason,
  });
  console.log(
    `\nReverted change #${reverted.id} (${reverted.change_type}) ` +
      `on ${reverted.page_url}`,
  );
}

// --- Automation settings management ---

async function configureAutomation(): Promise<void> {
  // Read current settings
  const current = await client.changes.settings(DOMAIN);
  console.log("\n=== Current Automation Settings ===");
  printSettings(current);

  // Update: set meta tags to suggest-only mode, increase daily limit
  const updated = await client.changes.updateSettings(DOMAIN, {
    meta_tags_mode: "suggest",
    title_tags_mode: "suggest",
    max_changes_per_day: 50,
    max_changes_per_page_per_day: 5,
  });

  console.log("\n=== Updated Settings ===");
  printSettings(updated);
}

function printSettings(settings: ChangeSettings): void {
  console.log(`  Internal links: ${settings.internal_links_mode}`);
  console.log(`  Meta tags: ${settings.meta_tags_mode}`);
  console.log(`  OG tags: ${settings.og_tags_mode}`);
  console.log(`  Title tags: ${settings.title_tags_mode}`);
  console.log(`  Structured data: ${settings.structured_data_mode}`);
  console.log(`  Image alt: ${settings.image_alt_mode}`);
  console.log(`  Accessibility: ${settings.accessibility_mode}`);
  console.log(`  Local SEO: ${settings.local_seo_mode}`);
  console.log(`  Daily limit: ${settings.max_changes_per_day}`);
  console.log(`  Per-page limit: ${settings.max_changes_per_page_per_day}`);
  if (settings.exclude_paths) {
    console.log(`  Excluded paths: ${settings.exclude_paths}`);
  }
}

// --- Monitor change velocity ---

async function monitorVelocity(): Promise<void> {
  const stats = await client.changes.stats(DOMAIN);

  const pending = stats.by_status[ChangeStatus.Pending] ?? 0;
  const applied = stats.by_status[ChangeStatus.Applied] ?? 0;
  const rejected = stats.by_status[ChangeStatus.Rejected] ?? 0;

  // Alert if pending changes are piling up
  if (pending > 100) {
    console.warn(
      `[alert] ${pending} pending changes — review queue is growing`,
    );
  }

  // Track approval/rejection ratio
  const total = applied + rejected;
  if (total > 0) {
    const approvalRate = ((applied / total) * 100).toFixed(1);
    console.log(`[velocity] Approval rate: ${approvalRate}%`);
  }
}

// --- Helpers ---

function truncate(value: string | null, max: number): string {
  if (!value) return "(empty)";
  return value.length > max ? value.slice(0, max) + "..." : value;
}

// --- Full workflow ---

async function main() {
  // 1. Overview
  await printStats();

  // 2. Triage pending changes by type
  const triage = await triagePendingChanges();

  // 3. Auto-approve safe change types
  await bulkApprove(triage.autoApprovable, "auto-approvable");

  // 4. Manually review changes that need attention
  await reviewChanges(triage.needsReview);

  // 5. Configure automation settings
  await configureAutomation();

  // 6. Revert a specific change that caused issues
  // await revertChange(12345, "Caused 404 on /pricing — original title was correct");

  // 7. Monitor velocity
  await monitorVelocity();
}

main().catch(console.error);

// Usage:
//   SEOJUICE_API_KEY=sk_xxx npx tsx examples/changes-management.ts
