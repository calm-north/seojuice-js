export interface ContentGap {
  id: number;
  page_name: string;
  category: string;
  intent: string;
  seo_potential: number;
  total_search_volume: number;
  keywords: { keyword: string; rank_potential: number; color: string }[];
  aiso_driven: boolean;
  is_generated: boolean;
  has_potential_candidate: boolean;
}

export interface ContentDecayAlert {
  id: number;
  page_url: string | null;
  severity: string;
  decay_type: string;
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
  suggestions: Record<string, unknown>[];
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
  created_at: string;
}
