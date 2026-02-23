export interface ClusterSummary {
  id: number;
  name: string;
  slug: string;
  page_count: number;
  total_clicks: number;
  avg_position: number;
}

export interface ClusterDetail extends ClusterSummary {
  top_keywords: { keyword: string; impressions: number }[];
  time_series: {
    dates: string[];
    clicks: number[];
    impressions: number[];
    positions: number[];
  };
}
