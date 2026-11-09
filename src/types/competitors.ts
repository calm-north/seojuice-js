export interface Competitor {
  id: number;
  domain: string;
  score: number;
  intersections: number | null;
  estimated_traffic: number | null;
  content_gaps_count: number;
  avg_position: number | null;
  top_keywords: {
    keyword: string;
    your_position: number;
    their_position: number;
    volume: number;
  }[];
  trends?: {
    intersections_change: number;
    traffic_change_pct: number;
    keywords_change: number;
  };
}
