import { describe, it, expect, vi, beforeEach } from "vitest";
import { fetchSuggestions, injectSEO } from "../src/injection.js";
import type { SuggestionResponse } from "../src/types/injection.js";

function createSuggestionResponse(
  overrides: Partial<SuggestionResponse> = {},
): SuggestionResponse {
  return {
    errors: [],
    is_active: true,
    base: "https://example.com",
    isAsian: false,
    insert_into_content_only: false,
    suggestions: [],
    images: [],
    accessibility: [],
    accessibility_config: { enabled: false, language: "en" },
    structured_data: "",
    og_title: "",
    og_description: "",
    og_url: "",
    og_image: "",
    meta_description: "",
    meta_keywords: "",
    title: "",
    track_page_views: false,
    track_link_clicks: false,
    custom_link_class: "",
    ...overrides,
  };
}

describe("fetchSuggestions", () => {
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch = vi.fn();
  });

  it("calls correct URL with url param", async () => {
    const suggestions = createSuggestionResponse();
    mockFetch.mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue(suggestions),
    });

    await fetchSuggestions("https://example.com/page", {
      fetch: mockFetch,
    });

    const [url, options] = mockFetch.mock.calls[0];
    const parsed = new URL(url);
    expect(parsed.origin + parsed.pathname).toBe("https://smart.seojuice.io/suggestions");
    expect(parsed.searchParams.get("url")).toBe("https://example.com/page");
    expect(options.method).toBe("GET");
    expect(options.headers.Accept).toBe("application/json");
  });

  it("uses custom baseURL when provided", async () => {
    const suggestions = createSuggestionResponse();
    mockFetch.mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue(suggestions),
    });

    await fetchSuggestions("https://example.com/page", {
      baseURL: "https://custom.api.com/suggest",
      fetch: mockFetch,
    });

    const [url] = mockFetch.mock.calls[0];
    const parsed = new URL(url);
    expect(parsed.origin + parsed.pathname).toBe("https://custom.api.com/suggest");
  });

  it("throws on non-ok response", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
      statusText: "Internal Server Error",
    });

    await expect(
      fetchSuggestions("https://example.com/page", { fetch: mockFetch }),
    ).rejects.toThrow("Failed to fetch suggestions: 500 Internal Server Error");
  });

  it("returns parsed suggestion response", async () => {
    const suggestions = createSuggestionResponse({
      title: "My Page",
      meta_description: "A description",
    });
    mockFetch.mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue(suggestions),
    });

    const result = await fetchSuggestions("https://example.com/page", {
      fetch: mockFetch,
    });

    expect(result.title).toBe("My Page");
    expect(result.meta_description).toBe("A description");
  });
});

describe("injectSEO", () => {
  const baseHTML = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
</head>
<body>
<h1>Hello</h1>
</body>
</html>`;

  it("injects meta tags before </head>", () => {
    const suggestions = createSuggestionResponse({
      title: "My Title",
      meta_description: "My description",
      meta_keywords: "seo, tools",
    });

    const result = injectSEO({ html: baseHTML, suggestions });

    expect(result).toContain("<title>My Title</title>");
    expect(result).toContain('<meta name="description" content="My description">');
    expect(result).toContain('<meta name="keywords" content="seo, tools">');
    // Verify they appear before </head>
    const headCloseIdx = result.toLowerCase().indexOf("</head>");
    expect(result.indexOf("<title>My Title</title>")).toBeLessThan(headCloseIdx);
  });

  it("injects OG tags before </head>", () => {
    const suggestions = createSuggestionResponse({
      og_title: "OG Title",
      og_description: "OG Desc",
      og_url: "https://example.com/page",
      og_image: "https://example.com/image.jpg",
    });

    const result = injectSEO({ html: baseHTML, suggestions });

    expect(result).toContain('<meta property="og:title" content="OG Title">');
    expect(result).toContain('<meta property="og:description" content="OG Desc">');
    expect(result).toContain('<meta property="og:url" content="https://example.com/page">');
    expect(result).toContain('<meta property="og:image" content="https://example.com/image.jpg">');
  });

  it("injects structured data as JSON-LD script tag", () => {
    const jsonLd = '{"@context":"https://schema.org","@type":"Article","name":"Test"}';
    const suggestions = createSuggestionResponse({
      structured_data: jsonLd,
    });

    const result = injectSEO({ html: baseHTML, suggestions });

    expect(result).toContain('script type="application/ld+json"');
    expect(result).toContain('"@type":"Article"');
    expect(result).toContain('"name":"Test"');
  });

  it("sanitizes structured data containing </script> to prevent XSS", () => {
    const malicious = '{"@type":"Article","name":"</script><script>alert(1)</script>"}';
    const suggestions = createSuggestionResponse({
      structured_data: malicious,
    });

    const result = injectSEO({ html: baseHTML, suggestions });

    // The </script> sequence must be escaped — < becomes \u003c
    expect(result).not.toContain("</script><script>alert(1)");
    // Should contain the escaped < characters
    expect(result).toContain("\\u003c/script>");
  });

  it("rejects malformed JSON-LD gracefully", () => {
    const suggestions = createSuggestionResponse({
      structured_data: "not valid json {{{",
    });

    const result = injectSEO({ html: baseHTML, suggestions });

    // Should inject safe empty JSON-LD rather than the malformed string
    expect(result).toContain('<script type="application/ld+json">{}</script>');
  });

  it("injects link suggestions as JSON script before </body>", () => {
    const suggestions = createSuggestionResponse({
      suggestions: [
        { keyword: "seo tools", url: "https://example.com/tools" },
        { keyword: "analytics", url: "https://example.com/analytics" },
      ],
    });

    const result = injectSEO({ html: baseHTML, suggestions });

    expect(result).toContain('id="seojuice-links"');
    expect(result).toContain('"keyword":"seo tools"');

    // Verify it appears before </body>
    const bodyCloseIdx = result.toLowerCase().indexOf("</body>");
    const scriptIdx = result.indexOf('id="seojuice-links"');
    expect(scriptIdx).toBeLessThan(bodyCloseIdx);
  });

  it("sanitizes link suggestions containing </script> to prevent XSS", () => {
    const suggestions = createSuggestionResponse({
      suggestions: [
        { keyword: "test</script><script>alert(1)", url: "https://example.com" },
      ],
    });

    const result = injectSEO({ html: baseHTML, suggestions });

    // The </script> sequence must be escaped — < becomes \u003c
    expect(result).not.toContain("</script><script>alert(1)");
    expect(result).toContain("\\u003c/script>");
  });

  describe("option flags", () => {
    const fullSuggestions = createSuggestionResponse({
      title: "Title",
      meta_description: "Desc",
      og_title: "OG Title",
      og_description: "OG Desc",
      structured_data: '{"@type":"Thing"}',
      suggestions: [{ keyword: "test", url: "https://example.com/page" }],
    });

    it("does not inject links when injectLinks=false", () => {
      const result = injectSEO({
        html: baseHTML,
        suggestions: fullSuggestions,
        injectLinks: false,
      });

      expect(result).not.toContain('id="seojuice-links"');
      // Other injections should still be present
      expect(result).toContain("<title>Title</title>");
    });

    it("does not inject meta tags when injectMetaTags=false", () => {
      const result = injectSEO({
        html: baseHTML,
        suggestions: fullSuggestions,
        injectMetaTags: false,
      });

      expect(result).not.toContain("<title>Title</title>");
      expect(result).not.toContain('name="description"');
      // OG tags should still be present
      expect(result).toContain('property="og:title"');
    });

    it("does not inject OG tags when injectOGTags=false", () => {
      const result = injectSEO({
        html: baseHTML,
        suggestions: fullSuggestions,
        injectOGTags: false,
      });

      expect(result).not.toContain('property="og:title"');
      expect(result).not.toContain('property="og:description"');
      // Meta tags should still be present
      expect(result).toContain("<title>Title</title>");
    });

    it("does not inject structured data when injectStructuredData=false", () => {
      const result = injectSEO({
        html: baseHTML,
        suggestions: fullSuggestions,
        injectStructuredData: false,
      });

      expect(result).not.toContain("application/ld+json");
      // Other injections should still be present
      expect(result).toContain("<title>Title</title>");
    });

    it("disables all injections when all flags are false", () => {
      const result = injectSEO({
        html: baseHTML,
        suggestions: fullSuggestions,
        injectLinks: false,
        injectMetaTags: false,
        injectOGTags: false,
        injectStructuredData: false,
      });

      expect(result).toBe(baseHTML);
    });
  });

  it("handles HTML without </head> gracefully", () => {
    const noHeadHTML = "<html><body><h1>Hello</h1></body></html>";
    const suggestions = createSuggestionResponse({
      title: "Title",
      meta_description: "Desc",
    });

    const result = injectSEO({ html: noHeadHTML, suggestions });

    // Should not crash; meta tags just won't be injected
    expect(result).toContain("<body>");
    expect(result).not.toContain("<title>Title</title>");
  });

  it("handles HTML without </body> gracefully", () => {
    const noBodyHTML = "<html><head></head><p>Content</p></html>";
    const suggestions = createSuggestionResponse({
      suggestions: [{ keyword: "test", url: "https://example.com" }],
    });

    const result = injectSEO({ html: noBodyHTML, suggestions });

    // Links should not be injected since there's no </body>
    expect(result).not.toContain('id="seojuice-links"');
  });

  it("returns unchanged HTML when suggestions have no content", () => {
    const suggestions = createSuggestionResponse();
    const result = injectSEO({ html: baseHTML, suggestions });
    expect(result).toBe(baseHTML);
  });
});

describe("escapeAttr", () => {
  // escapeAttr is not exported, but we can test it indirectly through injectSEO
  it("escapes ampersands in attribute values", () => {
    const suggestions = createSuggestionResponse({
      title: "Tom & Jerry",
    });

    const result = injectSEO({ html: "<head></head><body></body>", suggestions });
    expect(result).toContain("<title>Tom &amp; Jerry</title>");
  });

  it("escapes double quotes in attribute values", () => {
    const suggestions = createSuggestionResponse({
      meta_description: 'He said "hello"',
    });

    const result = injectSEO({ html: "<head></head><body></body>", suggestions });
    expect(result).toContain('content="He said &quot;hello&quot;"');
  });

  it("escapes single quotes in attribute values", () => {
    const suggestions = createSuggestionResponse({
      meta_description: "It's great",
    });

    const result = injectSEO({ html: "<head></head><body></body>", suggestions });
    expect(result).toContain("It&#39;s great");
  });

  it("escapes angle brackets in attribute values", () => {
    const suggestions = createSuggestionResponse({
      meta_description: "a < b > c",
    });

    const result = injectSEO({ html: "<head></head><body></body>", suggestions });
    expect(result).toContain("a &lt; b &gt; c");
  });

  it("escapes multiple special characters together", () => {
    const suggestions = createSuggestionResponse({
      og_title: 'Tom & "Jerry" <friends>',
    });

    const result = injectSEO({ html: "<head></head><body></body>", suggestions });
    expect(result).toContain("Tom &amp; &quot;Jerry&quot; &lt;friends&gt;");
  });
});
