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
