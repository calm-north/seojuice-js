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
