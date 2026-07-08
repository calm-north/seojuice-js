export { SEOJuice } from "./client.js";
export type { SEOJuiceConfig } from "./client.js";

export {
  SEOJuiceError,
  AuthenticationError,
  NotFoundError,
  RateLimitError,
  APIError,
} from "./errors.js";
export type { APIErrorCode } from "./errors.js";

export { PaginatedResponse, autoPaginate } from "./pagination.js";
export type { PageFetcher, AutoPaginateParams } from "./pagination.js";

export { verifyWebhookSignature } from "./webhooks.js";

// Common types
export type { Pagination, PaginatedResult, PaginationParams, Period } from "./types/common.js";

// Website types
export type { WebsiteSummary, WebsiteKPIs, WebsiteDetail, WebsiteListResponse } from "./types/websites.js";

// Page types
export type {
  Link,
  ReadabilityScores,
  PageSummary,
  SearchStat,
  MetricsHistory,
} from "./types/pages.js";

// Intelligence types
export type {
  Trends,
  History,
  IntelligenceSummary,
  Topology,
  CoreWebVitals,
  LighthouseScores,
  ResourceSizes,
  PageSpeed,
} from "./types/intelligence.js";

// Cluster types
export type { ClusterSummary, ClusterDetail } from "./types/clusters.js";

// Content types
export type {
  ContentGap,
  ContentDecayAlert,
} from "./types/content.js";

// Changes types
export type {
  ChangeRecord,
  ChangeListParams,
  ChangeStats,
  ChangeSettings,
  BulkActionParams,
  BulkActionResult,
  ChangeWebhookPayload,
} from "./types/changes.js";

export {
  ChangeStatus,
  ChangeType,
  AutomationMode,
} from "./types/changes.js";

export { ChangesResource } from "./resources/changes.js";

// Competitor types
export type { Competitor } from "./types/competitors.js";

// AISO types
export type { AISO } from "./types/aiso.js";

// Keyword types
export type { Keyword, PageKeyword } from "./types/keywords.js";

// Backlink types
export type { Backlink, BacklinkDomain } from "./types/backlinks.js";

// Accessibility types
export type { AccessibilityIssue } from "./types/accessibility.js";

// Report & Analysis types
export type {
  ReportSummary,
  ReportDetail,
  ReportCreate,
  AnalysisRequest,
  AnalysisResult,
} from "./types/reports.js";

// GBP types
export type {
  GBPLocation,
  GBPReview,
  GBPLocationsResponse,
  GBPReplyResponse,
} from "./types/gbp.js";

// Similar pages types
export type { SimilarPage, SimilarPagesResponse } from "./types/similar.js";

// Injection types
export type {
  SuggestionLink,
  SuggestionImage,
  SuggestionDiff,
  BrokenLinkFix,
  AccessibilityConfig,
  SuggestionResponse,
} from "./types/injection.js";

// Resource parameter types
export type { IntelligenceSummaryParams, PageSpeedParams } from "./resources/intelligence.js";
export type { ContentGapParams, DecayAlertParams, ChangeParams } from "./resources/content.js";
export type { CompetitorParams } from "./resources/competitors.js";
export type { AISOParams } from "./resources/aiso.js";
export type { KeywordParams } from "./resources/keywords.js";
export type { BacklinkParams } from "./resources/backlinks.js";
export type { AccessibilityParams } from "./resources/accessibility.js";
export type { GBPReviewParams } from "./resources/gbp.js";
export type { SimilarPagesParams } from "./resources/similar.js";
export type { SearchStatsParams, MetricsHistoryParams } from "./resources/pages.js";
