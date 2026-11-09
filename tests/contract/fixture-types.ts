// Type-checks every success fixture body against the SDK response types.
// Two checks per fixture:
//   1. `satisfies`: every field the SDK type requires exists in the server body
//      with an assignable type (catches wrong names, null where SDK says non-null).
//   2. NoExtra: every key the server sends exists in the SDK type (catches fields
//      the SDK type does not know about).
// Drift fails `npm run typecheck:tests`. Nothing here runs at test time.
//
// Weak spot: JSON imports widen literals, so string unions (ChangeRecord.status) are
// checked against `string` here and against the server value list at runtime.
// An empty array in a fixture (`never[]`) checks nothing about its element type.
import type {
  AISO,
  AccessibilityIssue,
  AnalysisRequest,
  AnalysisResult,
  Backlink,
  BacklinkDomain,
  BulkActionResult,
  ChangeSettings,
  ChangeStats,
  ClusterDetail,
  ClusterSummary,
  Competitor,
  ContentDecayAlert,
  ContentGap,
  GBPLocationsResponse,
  GBPReplyResponse,
  GBPReview,
  IntelligenceSummary,
  Keyword,
  Link,
  MetricsHistory,
  PageKeyword,
  PageSpeed,
  PageSummary,
  PaginatedResult,
  ReportCreate,
  ReportDetail,
  ReportSummary,
  SearchStat,
  Topology,
  WebsiteDetail,
  WebsiteListResponse,
  ChangeRecord,
} from "../../src/index.js";

import type { Assert, NoExtra } from "./type-helpers.js";

type LooseChange = Omit<ChangeRecord, "status"> & { status: string };

import list_websites from "../fixtures/api-fixtures/list_websites.json";
import get_website from "../fixtures/api-fixtures/get_website.json";
import get_website_unlocked_on_single_plan from "../fixtures/api-fixtures/get_website_unlocked_on_single_plan.json";
import list_pages from "../fixtures/api-fixtures/list_pages.json";
import list_pages_paginated from "../fixtures/api-fixtures/list_pages_paginated.json";
import get_page from "../fixtures/api-fixtures/get_page.json";
import list_page_keywords from "../fixtures/api-fixtures/list_page_keywords.json";
import get_page_search_stats from "../fixtures/api-fixtures/get_page_search_stats.json";
import get_page_metrics_history from "../fixtures/api-fixtures/get_page_metrics_history.json";
import list_links from "../fixtures/api-fixtures/list_links.json";
import get_intelligence from "../fixtures/api-fixtures/get_intelligence.json";
import get_intelligence_with_history from "../fixtures/api-fixtures/get_intelligence_with_history.json";
import get_topology from "../fixtures/api-fixtures/get_topology.json";
import get_pagespeed from "../fixtures/api-fixtures/get_pagespeed.json";
import list_clusters from "../fixtures/api-fixtures/list_clusters.json";
import get_cluster from "../fixtures/api-fixtures/get_cluster.json";
import list_content_gaps from "../fixtures/api-fixtures/list_content_gaps.json";
import list_content_decay from "../fixtures/api-fixtures/list_content_decay.json";
import list_competitors from "../fixtures/api-fixtures/list_competitors.json";
import list_competitors_with_trends from "../fixtures/api-fixtures/list_competitors_with_trends.json";
import get_aiso from "../fixtures/api-fixtures/get_aiso.json";
import list_keywords from "../fixtures/api-fixtures/list_keywords.json";
import list_keywords_with_serp from "../fixtures/api-fixtures/list_keywords_with_serp.json";
import list_backlinks from "../fixtures/api-fixtures/list_backlinks.json";
import list_backlink_domains from "../fixtures/api-fixtures/list_backlink_domains.json";
import list_accessibility_issues from "../fixtures/api-fixtures/list_accessibility_issues.json";
import list_changes from "../fixtures/api-fixtures/list_changes.json";
import list_changes_filtered from "../fixtures/api-fixtures/list_changes_filtered.json";
import get_change from "../fixtures/api-fixtures/get_change.json";
import get_change_live from "../fixtures/api-fixtures/get_change_live.json";
import approve_change from "../fixtures/api-fixtures/approve_change.json";
import approve_heading_confirmed from "../fixtures/api-fixtures/approve_heading_confirmed.json";
import reject_change from "../fixtures/api-fixtures/reject_change.json";
import revert_change from "../fixtures/api-fixtures/revert_change.json";
import pull_change from "../fixtures/api-fixtures/pull_change.json";
import verify_change from "../fixtures/api-fixtures/verify_change.json";
import get_change_stats from "../fixtures/api-fixtures/get_change_stats.json";
import get_change_settings from "../fixtures/api-fixtures/get_change_settings.json";
import update_change_settings from "../fixtures/api-fixtures/update_change_settings.json";
import bulk_approve_changes from "../fixtures/api-fixtures/bulk_approve_changes.json";
import list_reports from "../fixtures/api-fixtures/list_reports.json";
import get_report from "../fixtures/api-fixtures/get_report.json";
import create_report from "../fixtures/api-fixtures/create_report.json";
import analyze_page from "../fixtures/api-fixtures/analyze_page.json";
import get_analysis_status from "../fixtures/api-fixtures/get_analysis_status.json";
import list_gbp_locations from "../fixtures/api-fixtures/list_gbp_locations.json";
import list_gbp_reviews from "../fixtures/api-fixtures/list_gbp_reviews.json";
import list_gbp_reviews_needs_attention from "../fixtures/api-fixtures/list_gbp_reviews_needs_attention.json";
import reply_to_gbp_review from "../fixtures/api-fixtures/reply_to_gbp_review.json";

export const typed = {
  list_websites: list_websites.response.body satisfies WebsiteListResponse,
  get_website: get_website.response.body satisfies WebsiteDetail,
  get_website_unlocked_on_single_plan: get_website_unlocked_on_single_plan.response.body satisfies WebsiteDetail,
  list_pages: list_pages.response.body satisfies PaginatedResult<PageSummary>,
  list_pages_paginated: list_pages_paginated.response.body satisfies PaginatedResult<PageSummary>,
  get_page: get_page.response.body satisfies PageSummary,
  list_page_keywords: list_page_keywords.response.body satisfies PaginatedResult<PageKeyword>,
  get_page_search_stats: get_page_search_stats.response.body satisfies PaginatedResult<SearchStat>,
  get_page_metrics_history: get_page_metrics_history.response.body satisfies PaginatedResult<MetricsHistory>,
  list_links: list_links.response.body satisfies PaginatedResult<Link>,
  get_intelligence: get_intelligence.response.body satisfies IntelligenceSummary,
  get_intelligence_with_history: get_intelligence_with_history.response.body satisfies IntelligenceSummary,
  get_topology: get_topology.response.body satisfies Topology,
  get_pagespeed: get_pagespeed.response.body satisfies PageSpeed,
  list_clusters: list_clusters.response.body satisfies PaginatedResult<ClusterSummary>,
  get_cluster: get_cluster.response.body satisfies ClusterDetail,
  list_content_gaps: list_content_gaps.response.body satisfies PaginatedResult<ContentGap>,
  list_content_decay: list_content_decay.response.body satisfies PaginatedResult<ContentDecayAlert>,
  list_competitors: list_competitors.response.body satisfies PaginatedResult<Competitor>,
  list_competitors_with_trends: list_competitors_with_trends.response.body satisfies PaginatedResult<Competitor>,
  get_aiso: get_aiso.response.body satisfies AISO,
  list_keywords: list_keywords.response.body satisfies PaginatedResult<Keyword>,
  list_keywords_with_serp: list_keywords_with_serp.response.body satisfies PaginatedResult<Keyword>,
  list_backlinks: list_backlinks.response.body satisfies PaginatedResult<Backlink>,
  list_backlink_domains: list_backlink_domains.response.body satisfies PaginatedResult<BacklinkDomain>,
  list_accessibility_issues: list_accessibility_issues.response.body satisfies PaginatedResult<AccessibilityIssue>,
  list_changes: list_changes.response.body satisfies PaginatedResult<LooseChange>,
  list_changes_filtered: list_changes_filtered.response.body satisfies PaginatedResult<LooseChange>,
  get_change: get_change.response.body satisfies LooseChange,
  get_change_live: get_change_live.response.body satisfies LooseChange,
  approve_change: approve_change.response.body satisfies LooseChange,
  approve_heading_confirmed: approve_heading_confirmed.response.body satisfies LooseChange,
  reject_change: reject_change.response.body satisfies LooseChange,
  revert_change: revert_change.response.body satisfies LooseChange,
  pull_change: pull_change.response.body satisfies LooseChange,
  verify_change: verify_change.response.body satisfies LooseChange,
  get_change_stats: get_change_stats.response.body satisfies ChangeStats,
  get_change_settings: get_change_settings.response.body satisfies ChangeSettings,
  update_change_settings: update_change_settings.response.body satisfies ChangeSettings,
  bulk_approve_changes: bulk_approve_changes.response.body satisfies BulkActionResult,
  list_reports: list_reports.response.body satisfies PaginatedResult<ReportSummary>,
  get_report: get_report.response.body satisfies ReportDetail,
  create_report: create_report.response.body satisfies ReportCreate,
  analyze_page: analyze_page.response.body satisfies AnalysisRequest,
  get_analysis_status: get_analysis_status.response.body satisfies AnalysisResult,
  list_gbp_locations: list_gbp_locations.response.body satisfies GBPLocationsResponse,
  list_gbp_reviews: list_gbp_reviews.response.body satisfies PaginatedResult<GBPReview>,
  list_gbp_reviews_needs_attention: list_gbp_reviews_needs_attention.response.body satisfies PaginatedResult<GBPReview>,
  reply_to_gbp_review: reply_to_gbp_review.response.body satisfies GBPReplyResponse,
};

export type NoExtra_list_websites = Assert<NoExtra<typeof list_websites.response.body, WebsiteListResponse>>;
export type NoExtra_get_website = Assert<NoExtra<typeof get_website.response.body, WebsiteDetail>>;
export type NoExtra_get_website_unlocked_on_single_plan = Assert<NoExtra<typeof get_website_unlocked_on_single_plan.response.body, WebsiteDetail>>;
export type NoExtra_list_pages = Assert<NoExtra<typeof list_pages.response.body, PaginatedResult<PageSummary>>>;
export type NoExtra_list_pages_paginated = Assert<NoExtra<typeof list_pages_paginated.response.body, PaginatedResult<PageSummary>>>;
export type NoExtra_get_page = Assert<NoExtra<typeof get_page.response.body, PageSummary>>;
export type NoExtra_list_page_keywords = Assert<NoExtra<typeof list_page_keywords.response.body, PaginatedResult<PageKeyword>>>;
export type NoExtra_get_page_search_stats = Assert<NoExtra<typeof get_page_search_stats.response.body, PaginatedResult<SearchStat>>>;
export type NoExtra_get_page_metrics_history = Assert<NoExtra<typeof get_page_metrics_history.response.body, PaginatedResult<MetricsHistory>>>;
export type NoExtra_list_links = Assert<NoExtra<typeof list_links.response.body, PaginatedResult<Link>>>;
export type NoExtra_get_intelligence = Assert<NoExtra<typeof get_intelligence.response.body, IntelligenceSummary>>;
export type NoExtra_get_intelligence_with_history = Assert<NoExtra<typeof get_intelligence_with_history.response.body, IntelligenceSummary>>;
export type NoExtra_get_topology = Assert<NoExtra<typeof get_topology.response.body, Topology>>;
export type NoExtra_get_pagespeed = Assert<NoExtra<typeof get_pagespeed.response.body, PageSpeed>>;
export type NoExtra_list_clusters = Assert<NoExtra<typeof list_clusters.response.body, PaginatedResult<ClusterSummary>>>;
export type NoExtra_get_cluster = Assert<NoExtra<typeof get_cluster.response.body, ClusterDetail>>;
export type NoExtra_list_content_gaps = Assert<NoExtra<typeof list_content_gaps.response.body, PaginatedResult<ContentGap>>>;
export type NoExtra_list_content_decay = Assert<NoExtra<typeof list_content_decay.response.body, PaginatedResult<ContentDecayAlert>>>;
export type NoExtra_list_competitors = Assert<NoExtra<typeof list_competitors.response.body, PaginatedResult<Competitor>>>;
export type NoExtra_list_competitors_with_trends = Assert<NoExtra<typeof list_competitors_with_trends.response.body, PaginatedResult<Competitor>>>;
export type NoExtra_get_aiso = Assert<NoExtra<typeof get_aiso.response.body, AISO>>;
export type NoExtra_list_keywords = Assert<NoExtra<typeof list_keywords.response.body, PaginatedResult<Keyword>>>;
export type NoExtra_list_keywords_with_serp = Assert<NoExtra<typeof list_keywords_with_serp.response.body, PaginatedResult<Keyword>>>;
export type NoExtra_list_backlinks = Assert<NoExtra<typeof list_backlinks.response.body, PaginatedResult<Backlink>>>;
export type NoExtra_list_backlink_domains = Assert<NoExtra<typeof list_backlink_domains.response.body, PaginatedResult<BacklinkDomain>>>;
export type NoExtra_list_accessibility_issues = Assert<NoExtra<typeof list_accessibility_issues.response.body, PaginatedResult<AccessibilityIssue>>>;
export type NoExtra_list_changes = Assert<NoExtra<typeof list_changes.response.body, PaginatedResult<LooseChange>>>;
export type NoExtra_list_changes_filtered = Assert<NoExtra<typeof list_changes_filtered.response.body, PaginatedResult<LooseChange>>>;
export type NoExtra_get_change = Assert<NoExtra<typeof get_change.response.body, LooseChange>>;
export type NoExtra_get_change_live = Assert<NoExtra<typeof get_change_live.response.body, LooseChange>>;
export type NoExtra_approve_change = Assert<NoExtra<typeof approve_change.response.body, LooseChange>>;
export type NoExtra_approve_heading_confirmed = Assert<NoExtra<typeof approve_heading_confirmed.response.body, LooseChange>>;
export type NoExtra_reject_change = Assert<NoExtra<typeof reject_change.response.body, LooseChange>>;
export type NoExtra_revert_change = Assert<NoExtra<typeof revert_change.response.body, LooseChange>>;
export type NoExtra_pull_change = Assert<NoExtra<typeof pull_change.response.body, LooseChange>>;
export type NoExtra_verify_change = Assert<NoExtra<typeof verify_change.response.body, LooseChange>>;
export type NoExtra_get_change_stats = Assert<NoExtra<typeof get_change_stats.response.body, ChangeStats>>;
export type NoExtra_get_change_settings = Assert<NoExtra<typeof get_change_settings.response.body, ChangeSettings>>;
export type NoExtra_update_change_settings = Assert<NoExtra<typeof update_change_settings.response.body, ChangeSettings>>;
export type NoExtra_bulk_approve_changes = Assert<NoExtra<typeof bulk_approve_changes.response.body, BulkActionResult>>;
export type NoExtra_list_reports = Assert<NoExtra<typeof list_reports.response.body, PaginatedResult<ReportSummary>>>;
export type NoExtra_get_report = Assert<NoExtra<typeof get_report.response.body, ReportDetail>>;
export type NoExtra_create_report = Assert<NoExtra<typeof create_report.response.body, ReportCreate>>;
export type NoExtra_analyze_page = Assert<NoExtra<typeof analyze_page.response.body, AnalysisRequest>>;
export type NoExtra_get_analysis_status = Assert<NoExtra<typeof get_analysis_status.response.body, AnalysisResult>>;
export type NoExtra_list_gbp_locations = Assert<NoExtra<typeof list_gbp_locations.response.body, GBPLocationsResponse>>;
export type NoExtra_list_gbp_reviews = Assert<NoExtra<typeof list_gbp_reviews.response.body, PaginatedResult<GBPReview>>>;
export type NoExtra_list_gbp_reviews_needs_attention = Assert<NoExtra<typeof list_gbp_reviews_needs_attention.response.body, PaginatedResult<GBPReview>>>;
export type NoExtra_reply_to_gbp_review = Assert<NoExtra<typeof reply_to_gbp_review.response.body, GBPReplyResponse>>;
