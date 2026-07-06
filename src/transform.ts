import type { SuggestionResponse } from "./types/injection.js";

export interface Manifest {
  cs: number[];
  meta: string[];
  img: number;
  schema: number;
  h1: number;
}

export function escapeHtml(text: string): string {
  if (!text) return "";
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function normalizeImageUrl(url: string): string {
  if (!url) return "";
  url = url.split("?")[0];
  if (url.startsWith("https:")) return url.substring(6);
  if (url.startsWith("http:")) return url.substring(5);
  return url;
}

type Segment = { type: "text" | "tag"; value: string };

export function tokenizeHTML(html: string): Segment[] {
  const segments: Segment[] = [];
  const tagRe = /(<[^>]*>)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = tagRe.exec(html)) !== null) {
    if (m.index > last) segments.push({ type: "text", value: html.slice(last, m.index) });
    segments.push({ type: "tag", value: m[0] });
    last = m.index + m[0].length;
  }
  if (last < html.length) segments.push({ type: "text", value: html.slice(last) });
  return segments;
}

export const SKIP_TAG_RE = /^<(a|script|style|title|h[1-6])[\s/>]/i;
export const CLOSE_TAG_RE = /^<\/(a|script|style|title|h[1-6])>/i;

export function replaceMetaTags(html: string, s: SuggestionResponse, manifest: Manifest): string {
  const {
    title,
    meta_description,
    meta_keywords,
    og_title,
    og_description,
    og_url,
    og_image,
    structured_data,
  } = s;

  if (title && !html.match(/<title[\s>]/i)) {
    html = html.replace(/<\/head>/i, `<title data-seojuice="title">${escapeHtml(title)}</title>\n</head>`);
    manifest.meta.push("title");
  }

  if (meta_description && !html.match(/<meta\s+name=["']description["']/i)) {
    html = html.replace(
      /<\/head>/i,
      `<meta name="description" content="${escapeHtml(meta_description)}" data-seojuice="meta-description">\n</head>`,
    );
    manifest.meta.push("meta-description");
  }

  if (meta_keywords && !html.match(/<meta\s+name=["']keywords["']/i)) {
    html = html.replace(
      /<\/head>/i,
      `<meta name="keywords" content="${escapeHtml(meta_keywords)}" data-seojuice="meta-keywords">\n</head>`,
    );
    manifest.meta.push("meta-keywords");
  }

  if (og_title && !html.match(/<meta\s+property=["']og:title["']/i)) {
    html = html.replace(
      /<\/head>/i,
      `<meta property="og:title" content="${escapeHtml(og_title)}" data-seojuice="og-title">\n</head>`,
    );
    manifest.meta.push("og-title");
  }

  if (og_description && !html.match(/<meta\s+property=["']og:description["']/i)) {
    html = html.replace(
      /<\/head>/i,
      `<meta property="og:description" content="${escapeHtml(og_description)}" data-seojuice="og-description">\n</head>`,
    );
    manifest.meta.push("og-description");
  }

  if (og_url && !html.match(/<meta\s+property=["']og:url["']/i)) {
    html = html.replace(/<\/head>/i, `<meta property="og:url" content="${escapeHtml(og_url)}">\n</head>`);
  }

  if (og_image && !html.match(/<meta\s+property=["']og:image["']/i)) {
    html = html.replace(/<\/head>/i, `<meta property="og:image" content="${escapeHtml(og_image)}">\n</head>`);
  }

  if (structured_data && structured_data !== "null") {
    try {
      const jsonString = JSON.parse(structured_data);
      const obj = JSON.parse(jsonString);
      if (!html.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>/i)) {
        html = html.replace(
          /<\/head>/i,
          `<script type="application/ld+json" data-seojuice="schema">${JSON.stringify(obj)}</script>\n</head>`,
        );
        manifest.schema = 1;
      }
    } catch {
      /* leave schema out on parse failure */
    }
  }

  return html;
}

export function replaceH1(html: string, s: SuggestionResponse, manifest: Manifest): string {
  if (!s.h1) return html;
  return html.replace(/(<h1[^>]*>)([\s\S]*?)(<\/h1>)/i, (_m, open: string, _inner: string, close: string) => {
    let markedOpen = open;
    if (!markedOpen.includes("data-seojuice=")) {
      markedOpen = markedOpen.replace(/>$/, ' data-seojuice="h1">');
    }
    manifest.h1 = 1;
    return markedOpen + escapeHtml(s.h1) + close;
  });
}
