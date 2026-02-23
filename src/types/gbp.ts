export interface GBPLocation {
  id: number;
  location_id: string;
  name: string;
  address: string;
  phone: string;
  average_rating: number;
  total_reviews: number;
  last_fetched_at: string;
}

export interface GBPReview {
  id: number;
  review_id: string;
  location_name: string;
  author_name: string;
  rating: number;
  comment: string | null;
  reply: string | null;
  reply_suggestion: string | null;
  sentiment: string;
  needs_attention: boolean;
  auto_replied: boolean;
  published_at: string;
  reply_posted_at: string | null;
}

export interface GBPLocationsResponse {
  results: GBPLocation[];
}

export interface GBPReplyResponse {
  success: boolean;
  review_id: number;
  reply: string;
}
