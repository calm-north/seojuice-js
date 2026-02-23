export interface SimilarPage {
  url: string;
  title: string;
  similarity: number;
  cluster: string | null;
}

export interface SimilarPagesResponse {
  source: {
    url: string;
    title: string;
  };
  similar_pages: SimilarPage[];
}
