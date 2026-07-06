import { describe, it, expect } from "vitest";
import {
  escapeHtml,
  normalizeImageUrl,
  tokenizeHTML,
  replaceMetaTags,
  replaceH1,
  replaceImages,
  injectInternalLinks,
  applyContentDiffs,
  applyBrokenLinkFixes,
} from "../src/transform.js";

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

describe("replaceImages", () => {
  it("fills empty alt from images by normalized url", () => {
    const s = S({ images: [{ url: "https://cdn.x/a.png", alt_text: "A nice chart" }] });
    const out = replaceImages('<img src="https://cdn.x/a.png?v=2">', s, M());
    expect(out).toBe('<img alt="A nice chart" data-seojuice="alt" src="https://cdn.x/a.png?v=2">');
  });
  it("does not overwrite a good existing alt", () => {
    const s = S({ images: [{ url: "https://cdn.x/a.png", alt_text: "A nice chart" }] });
    const html = '<img src="https://cdn.x/a.png" alt="already meaningful">';
    expect(replaceImages(html, s, M())).toBe(html);
  });
});

describe("injectInternalLinks", () => {
  it("links first occurrence only, with cs marker", () => {
    const s = S({ suggestions: [{ keyword: "SWP plan", url: "/swp", id: 7 }] });
    const out = injectInternalLinks("<p>Learn SWP plan. Another SWP plan here.</p>", s, M());
    expect(out).toBe('<p>Learn <a href="/swp" data-seojuice-cs="7">SWP plan</a>. Another SWP plan here.</p>');
  });
  it("never links inside an existing anchor or heading", () => {
    const s = S({ suggestions: [{ keyword: "SWP", url: "/swp", id: 1 }] });
    expect(injectInternalLinks('<a href="/x">SWP</a>', s, M())).toBe('<a href="/x">SWP</a>');
    expect(injectInternalLinks("<h1>SWP</h1>", s, M())).toBe("<h1>SWP</h1>");
  });
  it("applies custom_link_class", () => {
    const s = S({ suggestions: [{ keyword: "SWP", url: "/swp", id: 2 }], custom_link_class: "brand" });
    expect(injectInternalLinks("<p>SWP</p>", s, M())).toContain('class="seojuice-link brand"');
  });
  it("links a Chinese keyword between CJK chars when isAsian", () => {
    const s = S({ suggestions: [{ keyword: "投资基金", url: "/funds", id: 501 }], isAsian: true });
    const out = injectInternalLinks("<p>我想了解投资基金的收益。</p>", s, M());
    expect(out).toBe('<p>我想了解<a href="/funds" data-seojuice-cs="501">投资基金</a>的收益。</p>');
  });
  it("links a Japanese keyword (kanji+kana) when isAsian", () => {
    const s = S({ suggestions: [{ keyword: "投資信託", url: "/toushin", id: 777 }], isAsian: true });
    expect(injectInternalLinks("<p>私は投資信託を学ぶ。</p>", s, M())).toContain(
      '<a href="/toushin" data-seojuice-cs="777">投資信託</a>',
    );
  });
});

describe("applyContentDiffs", () => {
  it("applies a unique diff and marks single-root replacement", () => {
    const out = applyContentDiffs(
      "<div><p>old copy</p></div>",
      [{ id: 9, original_text: "<p>old copy</p>", replacement_html: "<p>new copy</p>" }],
      M(),
    );
    expect(out).toBe('<div><p data-seojuice-cs="9">new copy</p></div>');
  });
  it("skips an ambiguous diff (original appears twice)", () => {
    const html = "<p>dup</p><p>dup</p>";
    expect(applyContentDiffs(html, [{ id: 1, original_text: "dup", replacement_html: "X" }], M())).toBe(html);
  });
  it("skips a drifted diff (original absent)", () => {
    const html = "<p>present</p>";
    expect(applyContentDiffs(html, [{ id: 1, original_text: "missing", replacement_html: "X" }], M())).toBe(html);
  });
  it("is idempotent (already applied)", () => {
    const html = '<p data-seojuice-cs="9">new copy</p>';
    expect(
      applyContentDiffs(
        html,
        [{ id: 9, original_text: "<p>old copy</p>", replacement_html: '<p data-seojuice-cs="9">new copy</p>' }],
        M(),
      ),
    ).toBe(html);
  });
});

describe("applyBrokenLinkFixes", () => {
  it("replace via edge-path new_url", () => {
    const out = applyBrokenLinkFixes('<a href="/dead">x</a>', [
      { action: "replace", tag: "a", attr: "href", broken_url: "/dead", new_url: "/live" },
    ]);
    expect(out).toBe('<a href="/live">x</a>');
  });
  it("replace via legacy-path replacement_url when new_url empty", () => {
    const out = applyBrokenLinkFixes('<a href="/dead">x</a>', [
      { action: "replace", tag: "a", attr: "href", broken_url: "/dead", new_url: "", replacement_url: "/live" },
    ]);
    expect(out).toBe('<a href="/live">x</a>');
  });
  it("unlink removes the whole anchor", () => {
    expect(
      applyBrokenLinkFixes('before<a href="/dead">x</a>after', [
        { action: "unlink", tag: "a", attr: "href", broken_url: "/dead" },
      ]),
    ).toBe("beforeafter");
  });
  it("does not touch data-href", () => {
    const html = '<a data-href="/dead">x</a>';
    expect(
      applyBrokenLinkFixes(html, [{ action: "replace", tag: "a", attr: "href", broken_url: "/dead", new_url: "/live" }]),
    ).toBe(html);
  });
});
