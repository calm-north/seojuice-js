export interface SuggestionLink {
  keyword: string;
  url: string;
  id?: number | null;
  context?: string | null;
}

export interface SuggestionImage {
  url: string;
  alt_text: string;
  reason?: string | null;
}

export interface SuggestionDiff {
  id?: number | null;
  original_text: string;
  replacement_html: string;
  selector?: string;
  semantic?: string;
  /** Sent by the server; neither the SDK nor the Worker reads it. */
  operation?: string;
  order?: number;
  batch_id?: string | null;
}

export interface BrokenLinkFix {
  action: "replace" | "unlink" | null;
  tag: "a" | "img";
  attr: "href" | "src";
  broken_url?: string;
  anchor_text?: string;
  old_url?: string;
  new_url?: string;
  replacement_url?: string;
}

export interface AccessibilityConfig {
  enabled: boolean;
  language: string;
}

// I2 — the runtime (transform.ts/injection.ts) treats every one of these
// fields as optional: arrays are guarded with `Array.isArray`/`?? []`,
// strings/booleans with truthiness or `=== true` checks, and several
// fields (is_active, base, accessibility, accessibility_config,
// overwrite_existing_alt_text, track_page_views, track_link_clicks) are
// never read at all by this package. None are read unguarded, so a
// consumer building a payload should only have to supply the fields they
// actually use.
export interface SuggestionResponse {
  errors?: string[];
  is_active?: boolean;
  /** Null in error payloads. */
  base?: string | null;
  isAsian?: boolean;
  insert_into_content_only?: boolean;
  suggestions?: SuggestionLink[];
  images?: SuggestionImage[];
  accessibility?: unknown[];
  /** `{}` when accessibility mode is off. */
  accessibility_config?: AccessibilityConfig | Record<string, never>;
  structured_data?: string;
  og_title?: string;
  og_description?: string;
  og_url?: string;
  og_image?: string;
  meta_description?: string;
  meta_keywords?: string;
  title?: string;
  h1?: string;
  diffs?: SuggestionDiff[];
  broken_link_fixes?: BrokenLinkFix[];
  overwrite_existing_alt_text?: boolean;
  track_page_views?: boolean;
  track_link_clicks?: boolean;
  custom_link_class?: string | null;
}
