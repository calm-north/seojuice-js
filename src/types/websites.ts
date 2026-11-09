export interface WebsiteSummary {
  domain: string;
  created_at: string;
}

export interface WebsiteKPIs {
  total_links: number;
  total_pages: number;
  total_keywords: number;
}

export interface WebsiteDetail {
  domain: string;
  created_at: string;
  last_processed_at: string | null;
  platform: string | null;
  industry: string | null;
  scores: Record<string, number>;
  seo_score: number | null;
  domain_health_score: number | null;
  domain_health_breakdown: Record<string, unknown> | null;
  avg_content_quality_score: number | null;
  avg_geo_readiness_score: number | null;
  report: { created_at: string; data: Record<string, unknown> } | null;
  kpis: WebsiteKPIs;
}

export interface WebsiteListResponse {
  results: WebsiteSummary[];
}
