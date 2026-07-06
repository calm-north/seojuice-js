import { describe, it, expect } from "vitest";
import { escapeHtml, normalizeImageUrl, tokenizeHTML, replaceMetaTags, replaceH1 } from "../src/transform.js";

export const S = (o: Partial<any> = {}): any => ({
  suggestions: [],
  images: [],
  diffs: [],
  broken_link_fixes: [],
  title: "",
  meta_description: "",
  meta_keywords: "",
  og_title: "",
  og_description: "",
  og_url: "",
  og_image: "",
  structured_data: "",
  h1: "",
  isAsian: false,
  insert_into_content_only: false,
  custom_link_class: "",
  ...o,
});
export const M = (): any => ({ cs: [], meta: [], img: 0, schema: 0, h1: 0 });

describe("helpers", () => {
  it("escapeHtml uses &#039; for apostrophe (Worker parity)", () => {
    expect(escapeHtml(`a'b<c>&"d`)).toBe("a&#039;b&lt;c&gt;&amp;&quot;d");
  });
  it("normalizeImageUrl strips scheme and query", () => {
    expect(normalizeImageUrl("https://x.com/a.png?w=1")).toBe("//x.com/a.png");
    expect(normalizeImageUrl("http://x.com/a.png")).toBe("//x.com/a.png");
  });
  it("tokenizeHTML splits text and tags in order", () => {
    const segs = tokenizeHTML("a<b>c</b>");
    expect(segs.map((s) => `${s.type}:${s.value}`)).toEqual(["text:a", "tag:<b>", "text:c", "tag:</b>"]);
  });
});

describe("replaceMetaTags / replaceH1", () => {
  it("adds title only when absent", () => {
    const m = M();
    expect(replaceMetaTags("<head></head>", S({ title: "Hi" }), m)).toContain(
      '<title data-seojuice="title">Hi</title>',
    );
    expect(replaceMetaTags("<head><title>X</title></head>", S({ title: "Hi" }), M())).toContain("<title>X</title>");
  });
  it("double-decodes structured_data into valid JSON-LD", () => {
    const inner = { "@context": "https://schema.org", "@type": "Article" };
    const payload = S({ structured_data: JSON.stringify(JSON.stringify(inner)) });
    const out = replaceMetaTags("<head></head>", payload, M());
    expect(out).toContain(
      '<script type="application/ld+json" data-seojuice="schema">{"@context":"https://schema.org","@type":"Article"}</script>',
    );
  });
  it("replaces h1 inner text and marks it", () => {
    const out = replaceH1("<h1 class='t'>old</h1>", S({ h1: "New" }), M());
    expect(out).toBe('<h1 class=\'t\' data-seojuice="h1">New</h1>');
  });
});
