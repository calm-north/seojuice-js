export interface Trends {
  seo_score_change: number;
  pages_change: number;
  clicks_change_pct: number;
  impressions_change_pct: number;
}

export interface History {
  dates: string[];
  seo_scores: number[];
  clicks: number[];
  impressions: number[];
}

export interface IntelligenceSummary {
  domain: string;
  seo_score: number;
  aiso_score: number;
  total_pages: number;
  total_clusters: number;
  total_internal_links: number;
  total_seojuice_links: number;
  orphan_pages: number;
  content_gaps: number;
  last_crawled_at: string | null;
  trends?: Trends;
  history?: History;
}

export interface Topology {
  total_pages: number;
  total_internal_links: number;
  orphan_pages_count: number;
  orphan_pages: { url: string; title: string }[];
  link_depth_distribution: Record<string, number>;
  avg_links_per_page: number;
  most_linked_pages: { url: string; title: string; incoming_links: number }[];
}

export interface CoreWebVitals {
  lcp: number | null;
  cls: number | null;
  fid: number | null;
  inp: number | null;
  fcp: number | null;
  ttfb: number | null;
}

export interface LighthouseScores {
  performance: number | null;
  accessibility: number | null;
  best_practices: number | null;
  seo: number | null;
}

export interface ResourceSizes {
  total_kb: number | null;
  js_kb: number | null;
  css_kb: number | null;
  image_kb: number | null;
}

export interface PageSpeed {
  url: string;
  loading_time: number | null;
  core_web_vitals: CoreWebVitals;
  scores: LighthouseScores;
  resource_sizes: ResourceSizes;
  measured_at: string | null;
}
