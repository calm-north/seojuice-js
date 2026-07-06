import type { SuggestionResponse } from "./types/injection.js";
import {
  replaceMetaTags,
  replaceImages,
  injectInternalLinks,
  applyContentDiffs,
  replaceH1,
  applyBrokenLinkFixes,
  addManifestComment,
  addSsrFlag,
  validateApiResponse,
} from "./transform.js";
import type { Manifest } from "./transform.js";

export type { SuggestionResponse } from "./types/injection.js";
export type {
  SuggestionLink,
  SuggestionImage,
  SuggestionDiff,
  BrokenLinkFix,
  AccessibilityConfig,
} from "./types/injection.js";
export type { Manifest } from "./transform.js";

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
  injectImages?: boolean;
  injectDiffs?: boolean;
  injectH1?: boolean;
  injectBrokenLinks?: boolean;
}

/**
 * Full server-side parity injection, matching the SEOJuice edge Worker's
 * `transformHTML` pipeline: meta/OG/schema, images, internal links, content
 * diffs, h1, broken-link fixes, a manifest comment, and the SSR flag.
 *
 * C1 (`validateApiResponse`) gates the content-mutating transforms — an
 * invalid/actionless payload skips straight to the manifest comment (a
 * no-op when nothing changed) and the SSR flag, which are always applied,
 * matching the Worker's own unconditional behavior.
 *
 * Fails open: any thrown error, an empty result, a result under half the
 * original length, or a result missing a `<body>` tag all return the
 * original HTML unchanged.
 */
export function injectSEO(options: InjectSEOOptions): string {
  const { html, suggestions: s } = options;

  const t = {
    injectLinks: true,
    injectMetaTags: true,
    injectOGTags: true,
    injectStructuredData: true,
    injectImages: true,
    injectDiffs: true,
    injectH1: true,
    injectBrokenLinks: true,
    ...options,
  };

  const original = html;
  let out = html;
  const manifest: Manifest = { cs: [], meta: [], img: 0, schema: 0, h1: 0 };

  try {
    if (validateApiResponse(s)) {
      if (t.injectMetaTags || t.injectOGTags || t.injectStructuredData) {
        out = replaceMetaTags(out, s, manifest, {
          injectMetaTags: t.injectMetaTags,
          injectOGTags: t.injectOGTags,
          injectStructuredData: t.injectStructuredData,
        });
      }
      if (t.injectImages) out = replaceImages(out, s, manifest);
      if (t.injectLinks) out = injectInternalLinks(out, s, manifest);
      if (t.injectDiffs) out = applyContentDiffs(out, s.diffs ?? [], manifest);
      if (t.injectH1) out = replaceH1(out, s, manifest);
      if (t.injectBrokenLinks) out = applyBrokenLinkFixes(out, s.broken_link_fixes ?? []);
    }
    out = addManifestComment(out, manifest);
    out = addSsrFlag(out);
    if (!out || out.length < original.length * 0.5 || !/<body[\s>]/i.test(out)) {
      out = original;
    }
  } catch {
    out = original;
  }

  return out;
}
