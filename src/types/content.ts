export interface ContentGap {
  id: number;
  page_name: string;
  category: string;
  intent: string;
  seo_potential: number;
  total_search_volume: number;
  relevance: number | null;
  estimated_traffic_potential: number | null;
  keywords: {
    keyword: string;
    search_volume: number | null;
    keyword_difficulty: number | null;
    rank_potential: number | null;
  }[];
  aiso_driven: boolean;
  is_dismissed: boolean;
  is_generated: boolean;
  has_potential_candidate: boolean;
  created_at: string;
}

export interface ContentDecayAlert {
  id: number;
  page_url: string | null;
  signal_type: string;
  severity: string;
  /** Same value as `signal_type`, kept by the server for old clients. */
  decay_type: string;
  metrics: Record<string, unknown>;
  clicks_baseline: number | null;
  clicks_current: number | null;
  clicks_change_pct: number | null;
  impressions_baseline: number | null;
  impressions_current: number | null;
  impressions_change_pct: number | null;
  position_baseline: number | null;
  position_current: number | null;
  position_change: number | null;
  is_active: boolean;
  detected_at: string;
  resolved_at: string | null;
}
