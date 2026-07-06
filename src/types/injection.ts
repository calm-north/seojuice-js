export interface SuggestionLink {
  keyword: string;
  url: string;
  id?: number | null;
}

export interface SuggestionImage {
  url: string;
  alt_text: string;
}

export interface SuggestionDiff {
  id?: number | null;
  original_text: string;
  replacement_html: string;
}

export interface AccessibilityConfig {
  enabled: boolean;
  language: string;
}

export interface SuggestionResponse {
  errors: string[];
  is_active: boolean;
  base: string;
  isAsian: boolean;
  insert_into_content_only: boolean;
  suggestions: SuggestionLink[];
  images: SuggestionImage[];
  accessibility: unknown[];
  accessibility_config: AccessibilityConfig;
  structured_data: string;
  og_title: string;
  og_description: string;
  og_url: string;
  og_image: string;
  meta_description: string;
  meta_keywords: string;
  title: string;
  h1: string;
  diffs: SuggestionDiff[];
  track_page_views: boolean;
  track_link_clicks: boolean;
  custom_link_class: string;
}
