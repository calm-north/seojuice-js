export interface Backlink {
  id: number;
  source_url: string;
  target_url: string;
  anchor_text: string | null;
  dofollow: boolean;
  nofollow: boolean;
  status: string | null;
  link_type: string | null;
  page_from_rank: number | null;
  is_new: boolean;
  is_lost: boolean;
  first_discovered_at: string | null;
  last_crawled_at: string | null;
}

export interface BacklinkDomain {
  id: number;
  domain: string;
  rank: number | null;
  spam_score: number | null;
  country: string | null;
  platform: string | null;
  tld: string | null;
}
