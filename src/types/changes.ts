import type { PaginationParams } from "./common.js";

/**
 * `ChangeRecord.status` values: the server's change lifecycle state.
 * The members marked deprecated are the legacy filter/stats vocabulary; the
 * server never returns them in `status`. Use {@link ChangeStatusFilter} for
 * `changes.list({ status })` and `stats.by_status` keys.
 */
export enum ChangeStatus {
  Proposed = "proposed",
  Approved = "approved",
  Live = "live",
  RolledBack = "rolled_back",
  Rejected = "rejected",
  Superseded = "superseded",
  Stale = "stale",
  Expired = "expired",
  /** @deprecated Use `ChangeStatusFilter.Pending` (filter) or `ChangeStatus.Proposed` (record status). */
  Pending = "pending",
  /** @deprecated Use `ChangeStatusFilter.Applied` (filter) or `ChangeStatus.Live` (record status). */
  Applied = "applied",
  /** @deprecated The server reports pulled changes as `live`. */
  Pulled = "pulled",
  /** @deprecated The server reports verified changes as `live`. */
  Verified = "verified",
  /** @deprecated Use `ChangeStatus.RolledBack`. */
  Reverted = "reverted",
}

/** Lifecycle states the server returns in `ChangeRecord.status`. */
export type ChangeLifecycleState =
  | "proposed"
  | "approved"
  | "live"
  | "rolled_back"
  | "rejected"
  | "superseded"
  | "stale"
  | "expired";

/**
 * Values accepted by the `status` query filter of `changes.list`, and the
 * keys of `ChangeStats.by_status`. `pulled` and `verified` filter to all
 * `live` changes; as `by_status` keys they are always 0.
 */
export enum ChangeStatusFilter {
  Pending = "pending",
  Approved = "approved",
  Applied = "applied",
  Pulled = "pulled",
  Verified = "verified",
  Rejected = "rejected",
  Reverted = "reverted",
  Expired = "expired",
}

export enum ChangeType {
  InternalLink = "internal_link",
  MetaDescription = "meta_description",
  MetaKeywords = "meta_keywords",
  OgTitle = "og_title",
  OgDescription = "og_description",
  OgImage = "og_image",
  TitleTag = "title_tag",
  H1Tag = "h1_tag",
  StructuredData = "structured_data",
  ImageAlt = "image_alt",
  Accessibility = "accessibility",
  LocalSchema = "local_schema",
  NapFix = "nap_fix",
  BrokenLinkFix = "broken_link_fix",
  ContentPatch = "content_patch",
}

export enum AutomationMode {
  Off = "off",
  Suggest = "suggest",
  ManualDeploy = "manual_deploy",
  AutoDeploy = "auto_deploy",
}

export interface ChangeRecord {
  id: number;
  change_type: string;
  status: ChangeLifecycleState;
  risk_level: string | null;
  page_url: string | null;
  proposed_value: string | null;
  previous_value: string | null;
  reason: string | null;
  confidence_score: number | null;
  anchor_text: string | null;
  alternatives: unknown[];
  original_issues: unknown[];
  optimization_techniques: unknown[];
  seo_signals_improved: unknown[];
  potential_risks: unknown[];
  related_changes: unknown[];
  llm_metadata: Record<string, unknown>;
  created_at: string;
  reviewed_at: string | null;
  applied_at: string | null;
  pulled_at: string | null;
  pulled_by_integration: string | null;
  verified_at: string | null;
  reverted_at: string | null;
  revert_reason: string | null;
  batch_id: string | null;
  batch_label: string | null;
  edited_manually: boolean;
  mutation_type: string;
  verification_state: string;
  outcome_state: string;
  /** Apply instructions; present only for approved or live changes. */
  apply: Record<string, unknown> | null;
}

export interface ChangeListParams extends PaginationParams {
  status?: ChangeStatusFilter | `${ChangeStatusFilter}`;
  /** Only changes of this batch (UUID). */
  batch_id?: string;
  change_type?: string;
  url?: string;
}

export interface ChangeStats {
  total: number;
  /** Keys are {@link ChangeStatusFilter} values. `pulled` and `verified` are always 0; those changes count under `applied`. */
  by_status: Record<string, number>;
  by_type: Record<string, number>;
}

export interface ChangeSettings {
  internal_links_mode: string;
  meta_tags_mode: string;
  og_tags_mode: string;
  title_tags_mode: string;
  h1_tags_mode: string;
  structured_data_mode: string;
  image_alt_mode: string;
  accessibility_mode: string;
  local_seo_mode: string;
  gbp_review_reply_mode: string;
  max_changes_per_page_per_day: number;
  max_changes_per_day: number;
  exclude_paths: string | null;
}

export interface BulkActionParams {
  action: "approve" | "reject" | "revert" | "pull" | "verify";
  /** Required unless `batch_id` is set. Max 500. */
  ids?: number[];
  /** Act on every change of this batch (UUID) instead of `ids`. */
  batch_id?: string;
  reason?: string;
  integration?: string;
}

export interface BulkActionResult {
  action: string;
  succeeded: number[];
  failed: Array<{ id: number; error: string }>;
  total_succeeded: number;
  total_failed: number;
}

export interface ChangeWebhookPayload {
  event: string;
  change: ChangeRecord;
  website: { domain: string };
  timestamp: string;
  rejected_by?: string;
  reason?: string;
  reverted_by?: string;
  revert_reason?: string;
}
