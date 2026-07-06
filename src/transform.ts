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

export function replaceImages(html: string, s: SuggestionResponse, manifest: Manifest): string {
  if (!s.images || !Array.isArray(s.images)) return html;

  const imageMap = new Map<string, string>();
  for (const img of s.images) {
    if (img.url && img.alt_text) {
      imageMap.set(normalizeImageUrl(img.url), img.alt_text);
    }
  }

  if (imageMap.size === 0) return html;

  return html.replace(/<img([^>]+)>/gi, (match: string, attributes: string) => {
    const srcMatch = attributes.match(/(?:src|data-src)=["']([^"']+)["']/);
    if (!srcMatch) return match;

    const normalizedSrc = normalizeImageUrl(srcMatch[1]);
    if (!imageMap.has(normalizedSrc)) return match;

    const altMatch = match.match(/alt=["']([^"']*)["']/);
    const existingAlt = altMatch ? altMatch[1] : "";

    if (existingAlt && existingAlt.length >= 5) return match;

    const altText = escapeHtml(imageMap.get(normalizedSrc) as string);
    manifest.img += 1;

    if (altMatch) {
      let replaced = match.replace(/alt=["'][^"']*["']/, `alt="${altText}"`);
      if (!replaced.includes("data-seojuice=")) {
        replaced = replaced.replace(/<img/, `<img data-seojuice="alt"`);
      }
      return replaced;
    }
    return match.replace(/<img/, `<img alt="${altText}" data-seojuice="alt"`);
  });
}

interface LinkPattern {
  keyword: string;
  kl: string;
  url: string;
  id: number | null;
  pattern: RegExp;
}

export function injectInternalLinks(html: string, s: SuggestionResponse, manifest: Manifest): string {
  if (!s.suggestions || !Array.isArray(s.suggestions)) return html;

  const isAsian = s.isAsian || false;
  const customLinkClass = s.custom_link_class || "";
  const replacedKeywords = new Set<string>();

  const links: LinkPattern[] = [];
  for (const link of s.suggestions) {
    if (!link.keyword || !link.url) continue;
    const kl = link.keyword.toLowerCase();
    if (replacedKeywords.has(kl)) continue;
    replacedKeywords.add(kl);
    const escapedKeyword = escapeRegExp(link.keyword);
    const pattern = isAsian
      ? new RegExp(
          `(?<=[\\p{Script=Han}\\p{Script=Hiragana}\\p{Script=Katakana}]|^)(${escapedKeyword})(?=[\\p{Script=Han}\\p{Script=Hiragana}\\p{Script=Katakana}\\.!\\?\\)\\]\\/]|$)`,
          "u",
        )
      : new RegExp(
          `(?<=^|\\s|[([{<>"'«‹„"'|/]|\\-|:|'|'|')(${escapedKeyword})(?=$|\\s|[)\\]}>"'»›"'|/]|\\-|[.,:;!?]|'|'|')`,
          "i",
        );
    links.push({ keyword: link.keyword, kl, url: link.url, id: link.id != null ? link.id : null, pattern });
  }
  replacedKeywords.clear();

  if (links.length === 0) return html;

  const segments = tokenizeHTML(html);
  let skipDepth = 0;
  const result: string[] = [];

  for (const seg of segments) {
    if (seg.type === "tag") {
      if (SKIP_TAG_RE.test(seg.value)) skipDepth++;
      else if (CLOSE_TAG_RE.test(seg.value) && skipDepth > 0) skipDepth--;
      result.push(seg.value);
    } else {
      let text = seg.value;
      if (skipDepth === 0) {
        for (const link of links) {
          if (replacedKeywords.has(link.kl)) continue;
          text = text.replace(link.pattern, (match: string) => {
            if (replacedKeywords.has(link.kl)) return match;
            const classAttr = customLinkClass ? ` class="seojuice-link ${customLinkClass}"` : "";
            const csAttr = link.id != null ? ` data-seojuice-cs="${link.id}"` : "";
            const replacement = `<a href="${escapeHtml(link.url)}"${classAttr}${csAttr}>${escapeHtml(link.keyword)}</a>`;
            replacedKeywords.add(link.kl);
            if (link.id != null) manifest.cs.push(link.id);
            return replacement;
          });
        }
      }
      result.push(text);
    }
  }

  return result.join("");
}
