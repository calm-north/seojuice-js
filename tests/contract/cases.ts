import type { SEOJuice } from "../../src/client.js";
import { FIXTURE_DOMAIN as D } from "./fixtures.js";

type Call = (c: SEOJuice) => Promise<unknown>;

/**
 * Fixture name -> the SDK call that produces exactly that recorded request.
 * `as never` marks calls the SDK types forbid (a required argument is omitted
 * on purpose to reproduce the recorded server error).
 */
export const CASES: Record<string, Call> = {
  // websites
  list_websites: (c) => c.websites.list(),
  get_website: (c) => c.websites.get(D),
  get_website_unlocked_on_single_plan: (c) => c.websites.get(D),
  error_401_invalid_token: (c) => c.websites.list(),
  error_401_empty_token: (c) => c.websites.list(),
  error_401_missing_token: (c) => c.websites.list(),
  error_402_trial_required: (c) => c.websites.get(D),
  error_402_website_locked: (c) => c.websites.get(D),
  error_404_website_not_found: (c) => c.websites.get(D),
  // pages and links
  list_pages: (c) => c.pages.list(D),
  list_pages_paginated: (c) => c.pages.list(D, { page: 2, page_size: 1 }),
  error_400_invalid_pagination: (c) => c.pages.list(D, { page: 0 }),
  get_page: (c) => c.pages.get(D, 1),
  error_404_page_not_found: (c) => c.pages.get(D, 1),
  list_page_keywords: (c) => c.pages.listKeywords(D, 1),
  get_page_search_stats: (c) => c.pages.listSearchStats(D, 1),
  get_page_metrics_history: (c) => c.pages.listMetricsHistory(D, 1),
  list_links: (c) => c.links.list(D),
  // intelligence
  get_intelligence: (c) => c.intelligence.getSummary(D),
  get_intelligence_with_history: (c) =>
    c.intelligence.getSummary(D, { include_history: true, include_trends: true }),
  error_404_website_not_found_alt_code: (c) => c.intelligence.getSummary(D),
  get_topology: (c) => c.intelligence.getTopology(D),
  get_pagespeed: (c) =>
    c.intelligence.getPageSpeed(D, { url: "https://fixtures.example/guide/" }),
  error_400_missing_parameter: (c) => c.intelligence.getPageSpeed(D, {} as never),
  // clusters, content, competitors, aiso, keywords
  list_clusters: (c) => c.clusters.list(D),
  get_cluster: (c) => c.clusters.get(D, 1),
  error_404_cluster_not_found: (c) => c.clusters.get(D, 1),
  list_content_gaps: (c) => c.content.listGaps(D),
  list_content_decay: (c) => c.content.listDecayAlerts(D),
  list_competitors: (c) => c.competitors.list(D),
  list_competitors_with_trends: (c) => c.competitors.list(D, { include_trends: true }),
  get_aiso: (c) => c.aiso.get(D),
  list_keywords: (c) => c.keywords.list(D),
  list_keywords_with_serp: (c) => c.keywords.list(D, { include_serp: true }),
  list_backlinks: (c) => c.backlinks.list(D),
  list_backlink_domains: (c) => c.backlinks.listDomains(D),
  list_accessibility_issues: (c) => c.accessibility.list(D),
  // changes
  list_changes: (c) => c.changes.list(D),
  list_changes_filtered: (c) =>
    c.changes.list(D, { status: "pending", change_type: "meta_description" }),
  get_change: (c) => c.changes.get(D, 1),
  get_change_live: (c) => c.changes.get(D, 1),
  error_404_change_not_found: (c) => c.changes.get(D, 1),
  get_change_stats: (c) => c.changes.stats(D),
  get_change_settings: (c) => c.changes.settings(D),
  update_change_settings: (c) =>
    c.changes.updateSettings(D, {
      meta_tags_mode: "auto_deploy",
      max_changes_per_day: 25,
      exclude_paths: ["/tag/", "/cart/"] as never,
    }),
  update_change_settings_invalid_mode: (c) =>
    c.changes.updateSettings(D, { meta_tags_mode: "sometimes" }),
  approve_change: (c) => c.changes.approve(D, 1),
  approve_change_not_proposed: (c) => c.changes.approve(D, 1),
  approve_heading_without_confirmation: (c) => c.changes.approve(D, 1),
  approve_heading_confirmed: (c) => c.changes.approve(D, 1, { confirm_heading: true }),
  reject_change: (c) => c.changes.reject(D, 1, { reason: "Does not match our tone" }),
  reject_change_without_reason: (c) => c.changes.reject(D, 1, undefined as never),
  revert_change: (c) => c.changes.revert(D, 1, { reason: "Wrong title" }),
  pull_change: (c) => c.changes.pull(D, 1, { integration: "wordpress" }),
  pull_change_without_integration: (c) => c.changes.pull(D, 1, undefined as never),
  verify_change: (c) => c.changes.verify(D, 1, { integration: "wordpress" }),
  bulk_approve_changes: (c) => c.changes.bulk(D, { action: "approve", ids: [1, 2, 3] }),
  bulk_changes_invalid_action: (c) =>
    c.changes.bulk(D, { action: "explode" as never, ids: [1] }),
  // reports and analysis
  list_reports: (c) => c.reports.list(D),
  error_403_reports_not_in_plan: (c) => c.reports.list(D),
  get_report: (c) => c.reports.get(D, 1),
  get_report_pdf: (c) => c.reports.downloadPdf(D, 1),
  create_report: (c) => c.reports.create(D, { type: "last_week" }),
  create_report_invalid_type: (c) => c.reports.create(D, { type: "yearly" as never }),
  analyze_page: (c) => c.analysis.start(D, "https://fixtures.example/new-page/"),
  analyze_page_missing_url: (c) => c.analysis.start(D, undefined as never),
  get_analysis_status: (c) => c.analysis.getStatus(D, "analysis-done"),
  get_analysis_status_not_found: (c) => c.analysis.getStatus(D, "nope"),
  get_similar_pages: (c) => c.similar.find(D, { url: "https://fixtures.example/guide/" }),
  // gbp
  list_gbp_locations: (c) => c.gbp.listLocations(D),
  list_gbp_reviews: (c) => c.gbp.listReviews(D),
  list_gbp_reviews_needs_attention: (c) => c.gbp.listReviews(D, { needs_attention: true }),
  reply_to_gbp_review: (c) => c.gbp.replyToReview(D, 1, "Sorry about that. Please call us."),
  reply_to_gbp_review_missing_text: (c) => c.gbp.replyToReview(D, 1, undefined as never),
};

/**
 * Fixtures with no SDK method (out of scope: missing endpoints), or a request the SDK
 * cannot produce. Every fixture must be in CASES or here; a new fixture fails the
 * coverage test until it is placed.
 */
export const NO_SDK_METHOD = new Set([
  "create_action_item",
  "create_action_item_missing_title",
  "create_website",
  "create_website_already_exists",
  "create_website_missing_domain",
  "create_website_plan_limit",
  "error_400_invalid_json", // body is not JSON; the SDK always sends JSON
  "error_404_no_ai_monitoring",
  "error_404_no_search_console",
  "find_page",
  "get_action_item",
  "get_action_item_groups",
  "get_action_item_summary",
  "get_benchmarks",
  "get_content_piece",
  "get_domain_health",
  "get_link_analytics",
  "get_link_analytics_stats",
  "get_page_content",
  "get_page_content_quality",
  "get_page_geo_readiness",
  "get_report_summary",
  "get_search_performance",
  "get_search_performance_compare",
  "get_serp_landscape",
  "get_traffic_analytics",
  "get_url_status",
  "list_action_items",
  "list_ai_blind_spots",
  "list_ai_citations",
  "list_ai_prompts",
  "list_content_pieces",
  "list_keyword_movers",
  "submit_urls",
  "submit_urls_empty",
  "update_action_item_done",
  ]);
