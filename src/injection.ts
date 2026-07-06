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

export interface FetchSuggestionsOptions {
  baseURL?: string;
  fetch?: typeof globalThis.fetch;
  timeout?: number;
}

const DEFAULT_SUGGESTIONS_URL = "https://smart.seojuice.io/suggestions";
const DEFAULT_TIMEOUT = 10000;
// I3 — a hostile/misbehaving upstream must not be able to OOM the process
// via an unbounded suggestions payload. A legitimate response is a few KB;
// 5 MB is a generous cap. Best-effort: only catches the case where the
// response declares Content-Length.
const MAX_SUGGESTIONS_BYTES = 5_000_000;

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

    const contentLength = response.headers?.get?.("content-length");
    if (contentLength && Number(contentLength) > MAX_SUGGESTIONS_BYTES) {
      throw new Error(`Suggestions response too large: ${contentLength} bytes (cap ${MAX_SUGGESTIONS_BYTES})`);
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
export function injectSEO(options: InjectSEOOptions | null | undefined): string {
  if (!options || typeof options.html !== "string") return "";

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

/**
 * Framework-agnostic core for server-side adapters: fetches suggestions for
 * `url` and runs `injectSEO`. Fails open — any fetch/parse error returns the
 * original `html` unchanged. Used by `seojuice/next`'s `createSeoMiddleware`,
 * and directly usable from any custom server or edge runtime.
 */
export async function injectResponse(
  opts:
    | {
        html: string;
        url: string;
        fetch?: typeof globalThis.fetch;
        apiBase?: string;
        timeout?: number;
      }
    | null
    | undefined,
): Promise<string> {
  const safeHtml = typeof opts?.html === "string" ? opts.html : "";
  if (!opts || typeof opts.html !== "string") return safeHtml;

  try {
    // apiBase is the API origin (e.g. "https://smart.seojuice.io"), matching
    // how adapters use it for the /views beacon — derive the /suggestions
    // endpoint from it rather than passing the bare origin as the full URL.
    const baseURL = opts.apiBase ? `${opts.apiBase.replace(/\/$/, "")}/suggestions` : undefined;
    const suggestions = await fetchSuggestions(opts.url, {
      fetch: opts.fetch,
      baseURL,
      timeout: opts.timeout,
    });
    return injectSEO({ html: opts.html, suggestions });
  } catch {
    return safeHtml; // fail open — never re-read a possibly-null opts.html here
  }
}
