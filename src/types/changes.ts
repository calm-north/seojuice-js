import type { PaginationParams } from "./common.js";

export enum ChangeStatus {
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
  StructuredData = "structured_data",
  ImageAlt = "image_alt",
  Accessibility = "accessibility",
  LocalSchema = "local_schema",
  NapFix = "nap_fix",
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
  status: string;
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
}

export interface ChangeListParams extends PaginationParams {
  status?: string;
  change_type?: string;
  url?: string;
}

export interface ChangeStats {
  by_status: Record<string, number>;
  by_type: Record<string, number>;
}

export interface ChangeSettings {
  internal_links_mode: string;
  meta_tags_mode: string;
  og_tags_mode: string;
  title_tags_mode: string;
  structured_data_mode: string;
  image_alt_mode: string;
  accessibility_mode: string;
  local_seo_mode: string;
  gbp_review_reply_mode: string;
  max_changes_per_page_per_day: number;
  max_changes_per_day: number;
  exclude_paths: string;
}

export interface BulkActionParams {
  action: "approve" | "reject" | "revert" | "pull" | "verify";
  ids: number[];
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
