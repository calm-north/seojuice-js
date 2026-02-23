export interface AISO {
  aiso_score: number;
  sub_scores: {
    visibility: number;
    sentiment: number;
    position: number;
    coverage: number;
    competitive: number;
  };
  total_mentions: number;
  your_mentions: number;
  avg_position: number;
  positive_rate: number;
  providers: Record<string, unknown>;
  history?: {
    months: string[];
    aiso_scores: number[];
    total_mentions: number[];
    your_mentions: number[];
  };
}
