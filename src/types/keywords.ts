export interface Keyword {
  id: number;
  name: string;
  page_url: string | null;
  category: string | null;
  search_volume: number | null;
  keyword_difficulty: number | null;
  cpc: number | null;
  competition: number | null;
  ai_search_volume: number | null;
  last_updated: string | null;
  /** Present only with `include_serp=true`; null when the keyword has no SERP snapshot. */
  serp_features?: SerpFeatures | null;
  serp_enrichment?: SerpEnrichment | null;
}

export interface SerpFeatures {
  has_ai_overview: boolean;
  has_featured_snippet: boolean;
  has_people_also_ask: boolean;
  has_knowledge_graph: boolean;
  has_local_pack: boolean;
  user_serp_position: number | null;
  snapshot_date: string | null;
}

export interface SerpEnrichment {
  rankability_score: number | null;
  weak_spot_score: number | null;
  opportunity_label: string;
  scoring_version: string;
  enrichment_data: Record<string, unknown>;
}

export interface PageKeyword {
  id: number;
  keyword: string;
  processed_at: string | null;
  stats: {
    clicks: number;
    impressions: number;
    ctr: number;
    rank: number;
    created_at: string | null;
  } | null;
}
