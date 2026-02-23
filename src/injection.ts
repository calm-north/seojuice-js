import type { SuggestionResponse } from "./types/injection.js";

export type { SuggestionResponse } from "./types/injection.js";
export type { SuggestionLink, SuggestionImage, AccessibilityConfig } from "./types/injection.js";

export interface FetchSuggestionsOptions {
  baseURL?: string;
  fetch?: typeof globalThis.fetch;
  timeout?: number;
}

const DEFAULT_SUGGESTIONS_URL = "https://smart.seojuice.io/suggestions";
const DEFAULT_TIMEOUT = 10000;

export async function fetchSuggestions(
  url: string,
  options: FetchSuggestionsOptions = {},
): Promise<SuggestionResponse> {
  const baseURL = options.baseURL ?? DEFAULT_SUGGESTIONS_URL;
  const fetchFn = options.fetch ?? globalThis.fetch.bind(globalThis);
  const timeout = options.timeout ?? DEFAULT_TIMEOUT;

  const requestURL = new URL(baseURL);
  requestURL.searchParams.set("url", url);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetchFn(requestURL.toString(), {
      method: "GET",
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch suggestions: ${response.status} ${response.statusText}`);
    }

    return (await response.json()) as SuggestionResponse;
  } finally {
    clearTimeout(timer);
  }
}

export interface InjectSEOOptions {
  html: string;
  suggestions: SuggestionResponse;
  injectLinks?: boolean;
  injectMetaTags?: boolean;
  injectOGTags?: boolean;
  injectStructuredData?: boolean;
}

function escapeAttr(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * Sanitize a string for safe embedding inside a <script> tag.
 * Replaces all `<` with `\u003c` to prevent `</script>` breakouts.
 * This is the same approach used by Next.js and other frameworks.
 */
function htmlSafeJson(value: unknown): string {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

/**
 * Sanitize structured data (JSON-LD) for safe embedding in <script>.
 * Validates the JSON and escapes dangerous sequences.
 */
function safeJsonLd(raw: string): string {
  try {
    const parsed = JSON.parse(raw);
    return JSON.stringify(parsed).replace(/</g, "\\u003c");
  } catch {
    return "{}";
  }
}

export function injectSEO(options: InjectSEOOptions): string {
  const {
    html,
    suggestions,
    injectLinks = true,
    injectMetaTags = true,
    injectOGTags = true,
    injectStructuredData = true,
  } = options;

  let result = html;
  const headTags: string[] = [];

  if (injectMetaTags) {
    if (suggestions.title) {
      headTags.push(`<title>${escapeAttr(suggestions.title)}</title>`);
    }
    if (suggestions.meta_description) {
      headTags.push(
        `<meta name="description" content="${escapeAttr(suggestions.meta_description)}">`,
      );
    }
    if (suggestions.meta_keywords) {
      headTags.push(
        `<meta name="keywords" content="${escapeAttr(suggestions.meta_keywords)}">`,
      );
    }
  }

  if (injectOGTags) {
    if (suggestions.og_title) {
      headTags.push(
        `<meta property="og:title" content="${escapeAttr(suggestions.og_title)}">`,
      );
    }
    if (suggestions.og_description) {
      headTags.push(
        `<meta property="og:description" content="${escapeAttr(suggestions.og_description)}">`,
      );
    }
    if (suggestions.og_url) {
      headTags.push(
        `<meta property="og:url" content="${escapeAttr(suggestions.og_url)}">`,
      );
    }
    if (suggestions.og_image) {
      headTags.push(
        `<meta property="og:image" content="${escapeAttr(suggestions.og_image)}">`,
      );
    }
  }

  if (injectStructuredData && suggestions.structured_data) {
    headTags.push(
      `<script type="application/ld+json">${safeJsonLd(suggestions.structured_data)}</script>`,
    );
  }

  if (headTags.length > 0) {
    const headInsert = headTags.join("\n");
    const headCloseIdx = result.toLowerCase().indexOf("</head>");
    if (headCloseIdx !== -1) {
      result = result.slice(0, headCloseIdx) + headInsert + "\n" + result.slice(headCloseIdx);
    }
  }

  if (injectLinks && suggestions.suggestions.length > 0) {
    const linkData = htmlSafeJson(suggestions.suggestions);
    const scriptTag = `<script type="application/json" id="seojuice-links">${linkData}</script>`;
    const bodyCloseIdx = result.toLowerCase().indexOf("</body>");
    if (bodyCloseIdx !== -1) {
      result = result.slice(0, bodyCloseIdx) + scriptTag + "\n" + result.slice(bodyCloseIdx);
    }
  }

  return result;
}
