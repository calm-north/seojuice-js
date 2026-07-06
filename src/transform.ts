import type { SuggestionResponse, SuggestionDiff, BrokenLinkFix } from "./types/injection.js";

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

// C2 — content-area targeting: when insert_into_content_only is true, only these
// block-content tags' direct text may receive injected links (never headings/nav/footer chrome).
export const BLOCK_CONTENT_RE = /^<(p|li|span|div|td|blockquote|dd|figcaption)[\s>]/i;
export const BLOCK_CONTENT_CLOSE_RE = /^<\/(p|li|span|div|td|blockquote|dd|figcaption)>/i;

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

  const contentOnly = s.insert_into_content_only === true;
  const segments = tokenizeHTML(html);
  let skipDepth = 0;
  let blockDepth = 0;
  const result: string[] = [];

  for (const seg of segments) {
    if (seg.type === "tag") {
      if (SKIP_TAG_RE.test(seg.value)) skipDepth++;
      else if (CLOSE_TAG_RE.test(seg.value) && skipDepth > 0) skipDepth--;
      if (contentOnly) {
        if (BLOCK_CONTENT_RE.test(seg.value)) blockDepth++;
        else if (BLOCK_CONTENT_CLOSE_RE.test(seg.value) && blockDepth > 0) blockDepth--;
      }
      result.push(seg.value);
    } else {
      let text = seg.value;
      const canInject = skipDepth === 0 && (!contentOnly || blockDepth > 0);
      if (canInject) {
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

// Detects a single-root HTML element at the start of replacement_html.
// Matches <tagname> or <tagname ...attrs...> (tagname must be word chars only).
export const SINGLE_ROOT_RE = /^<(\w+)(\s[^>]*)?>/;

export function applyContentDiffs(html: string, diffs: SuggestionDiff[], manifest: Manifest): string {
  if (!Array.isArray(diffs)) return html;
  for (const d of diffs) {
    try {
      const original = d.original_text || "";
      let replacement = d.replacement_html || "";
      if (!original || !replacement) continue;
      if (html.includes(replacement) && !html.includes(original)) continue; // already applied
      const idx = html.indexOf(original);
      if (idx === -1) continue; // DOM drift → skip
      if (html.indexOf(original, idx + 1) !== -1) continue; // ambiguous → skip

      if (d.id != null) {
        const rootMatch = SINGLE_ROOT_RE.exec(replacement);
        if (rootMatch) {
          const markerStr = `data-seojuice-cs="${d.id}"`;
          if (!replacement.includes(markerStr)) {
            const openTag = rootMatch[0];
            const markedOpenTag = openTag.slice(0, -1) + ` ${markerStr}>`;
            replacement = markedOpenTag + replacement.slice(openTag.length);
          }
          if (!html.includes(`data-seojuice-cs="${d.id}"`)) {
            manifest.cs.push(d.id);
          }
        }
        // bare text / multi-root: no marker, just apply content as-is
      }

      html = html.slice(0, idx) + replacement + html.slice(idx + original.length);
    } catch {
      /* one bad diff never aborts the page */
    }
  }
  return html;
}

// Apply broken-link / broken-image fixes delivered in the API payload.
//
// action='replace': rewrite the matching attr value to the fix URL.
// action='unlink':  remove the matched element entirely.
//
// Matching is anchored to the exact tag + attr + old URL value so there is
// zero risk of collateral string replacement anywhere else in the document.
// The `\s`-anchor before the attribute name ensures `data-href`/`data-src`
// never match when the target attribute is `href`/`src`.
export function applyBrokenLinkFixes(html: string, fixes: BrokenLinkFix[]): string {
  if (!Array.isArray(fixes) || fixes.length === 0) return html;

  for (const fix of fixes) {
    try {
      const tag = (fix.tag || "").toLowerCase();
      const attr = (fix.attr || "").toLowerCase();
      const oldUrl = fix.broken_url || fix.old_url || "";
      // Two-shape URL read: edge payloads use new_url, legacy payloads use replacement_url.
      const newUrl = fix.new_url || fix.replacement_url || "";
      const action = fix.action === "unlink" ? "unlink" : "replace";

      if (!tag || !attr || !oldUrl) continue;
      if (action === "replace" && !newUrl) continue;
      if (tag !== "a" && tag !== "img") continue;
      if (attr !== "href" && attr !== "src") continue;

      const escapedOldUrl = escapeRegExp(oldUrl);

      if (action === "replace") {
        const re = new RegExp(`(<${tag}\\b[^>]*\\s${attr}=)(["'])(${escapedOldUrl})\\2([^>]*>)`, "gi");
        html = html.replace(
          re,
          (_m: string, before: string, quote: string, _old: string, after: string) =>
            `${before}${quote}${escapeHtml(newUrl)}${quote}${after}`,
        );
      } else if (tag === "img") {
        const re = new RegExp(`<img\\b[^>]*\\s${attr}=["']${escapedOldUrl}["'][^>]*>`, "gi");
        html = html.replace(re, "");
      } else {
        const re = new RegExp(`<a\\b[^>]*\\s${attr}=["']${escapedOldUrl}["'][^>]*>[\\s\\S]*?<\\/a>`, "gi");
        html = html.replace(re, "");
      }
    } catch {
      /* one bad fix never aborts the page */
    }
  }

  return html;
}

// C1 — gates the whole pipeline; a false result means "inject nothing, return original HTML".
export function validateApiResponse(s: unknown): boolean {
  const obj = s as Record<string, unknown>;
  if (!s || typeof s !== "object" || Array.isArray(s)) return false;
  if (Array.isArray(obj.errors) && (obj.errors as unknown[]).length > 0) return false;
  const hasContent =
    !!obj.title ||
    !!obj.meta_description ||
    (Array.isArray(obj.suggestions) && obj.suggestions.length) ||
    (Array.isArray(obj.images) && obj.images.length) ||
    !!obj.structured_data ||
    !!obj.og_title ||
    (Array.isArray(obj.diffs) && obj.diffs.length);
  if (!hasContent) return false;
  if ("suggestions" in obj && !Array.isArray(obj.suggestions)) return false;
  if ("images" in obj && !Array.isArray(obj.images)) return false;
  if ("diffs" in obj && !Array.isArray(obj.diffs)) return false;
  return true;
}
