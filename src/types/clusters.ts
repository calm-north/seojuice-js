export interface ClusterIssues {
  competing_queries: number;
  pages_without_cluster_link: number;
  close_to_page_1: number;
  open_action_items: number;
}

export interface ClusterSummary {
  id: number;
  name: string;
  slug: string;
  page_count: number;
  clicks: number;
  impressions: number;
  ctr: number | null;
  avg_position: number | null;
  clicks_change_pct: number | null;
  trend: string;
  pillar: { id: number; url: string; title: string | null } | null;
  cohesion: number | null;
  issues: ClusterIssues;
  is_active: boolean;
}

export interface ClusterDetail extends ClusterSummary {
  time_series: { week_start: string; clicks: number; impressions: number }[];
  top_queries: {
    keyword: string;
    clicks: number;
    impressions: number;
    ctr: number | null;
    position: number | null;
  }[];
  quality_history: {
    dates: string[];
    seo_scores: (number | null)[];
    performance_scores: (number | null)[];
    accessibility_scores: (number | null)[];
    best_practices_scores: (number | null)[];
  };
}

/** What the server returns for a cluster that is no longer active. */
export interface InactiveClusterDetail {
  id: number;
  name: string;
  slug: string;
  is_active: false;
}
