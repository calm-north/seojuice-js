export interface Link {
  page_from: string;
  page_to: string;
  keyword: string | null;
  created_at: string;
  impressions: number;
}

export interface ReadabilityScores {
  flesch_kincaid: number | null;
  automated_readability: number | null;
  dale_chall: number | null;
  coleman_liau: number | null;
}

export interface PageSummary {
  id: number;
  url: string;
  title: string | null;
  page_type: string | null;
  seo_score: number | null;
  accessibility_score: number | null;
  meta_description: string | null;
  language_code: string | null;
  created_at: string;
  last_processed_at: string | null;
  readability: ReadabilityScores;
  onpage_score: number | null;
  conversion_score: number | null;
  structured_data: Record<string, unknown> | null;
  has_structured_data: boolean;
  og_title: string | null;
  og_description: string | null;
  og_image: string | null;
  links: Link[];
}

export interface SearchStat {
  date: string | null;
  clicks: number | null;
  impressions: number | null;
  ctr: number | null;
  rank: number | null;
}

export interface MetricsHistory {
  created_at: string;
  seo_score: number | null;
  onpage_score: number | null;
  accessibility_score: number | null;
  word_count: number | null;
  gsc_clicks: number | null;
  gsc_impressions: number | null;
  gsc_avg_position: number | null;
  gsc_ctr: number | null;
  is_orphan: boolean | null;
  total_incoming_links: number | null;
  total_outgoing_links: number | null;
  cwv_lcp: number | null;
  cwv_cls: number | null;
  cwv_fid: number | null;
  cwv_inp: number | null;
  cwv_fcp: number | null;
  cwv_ttfb: number | null;
  cwv_performance_score: number | null;
}
