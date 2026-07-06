import { describe, it, expect } from "vitest";
import { escapeHtml, normalizeImageUrl, tokenizeHTML } from "../src/transform.js";

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
