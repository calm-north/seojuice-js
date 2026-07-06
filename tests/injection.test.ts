import { describe, it, expect, vi, beforeEach } from "vitest";
import { fetchSuggestions, injectSEO, injectResponse } from "../src/injection.js";
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
    h1: "",
    diffs: [],
    broken_link_fixes: [],
    overwrite_existing_alt_text: false,
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
<p>Body content long enough to comfortably survive the fail-open length-ratio check that guards every transform.</p>
</body>
</html>`;

  it("injects meta tags before </head> with data-seojuice markers", () => {
    const suggestions = createSuggestionResponse({
      title: "My Title",
      meta_description: "My description",
      meta_keywords: "seo, tools",
    });

    const result = injectSEO({ html: baseHTML, suggestions });

    expect(result).toContain('<title data-seojuice="title">My Title</title>');
    expect(result).toContain(
      '<meta name="description" content="My description" data-seojuice="meta-description">',
    );
    expect(result).toContain(
      '<meta name="keywords" content="seo, tools" data-seojuice="meta-keywords">',
    );
    const headCloseIdx = result.toLowerCase().indexOf("</head>");
    expect(result.indexOf("My Title")).toBeLessThan(headCloseIdx);
  });

  it("does not duplicate an existing <title>", () => {
    const html = baseHTML.replace("<head>", "<head><title>Existing</title>");
    const suggestions = createSuggestionResponse({ title: "New Title" });
    const result = injectSEO({ html, suggestions });
    expect(result).toContain("<title>Existing</title>");
    expect(result).not.toContain("New Title");
  });

  it("injects OG tags before </head>", () => {
    const suggestions = createSuggestionResponse({
      og_title: "OG Title",
      og_description: "OG Desc",
      og_url: "https://example.com/page",
      og_image: "https://example.com/image.jpg",
    });

    const result = injectSEO({ html: baseHTML, suggestions });

    expect(result).toContain('<meta property="og:title" content="OG Title" data-seojuice="og-title">');
    expect(result).toContain(
      '<meta property="og:description" content="OG Desc" data-seojuice="og-description">',
    );
    expect(result).toContain('<meta property="og:url" content="https://example.com/page">');
    expect(result).toContain('<meta property="og:image" content="https://example.com/image.jpg">');
  });

  it("double-decodes structured data into a JSON-LD script tag", () => {
    const inner = { "@context": "https://schema.org", "@type": "Article", name: "Test" };
    const suggestions = createSuggestionResponse({
      structured_data: JSON.stringify(JSON.stringify(inner)),
    });

    const result = injectSEO({ html: baseHTML, suggestions });

    expect(result).toContain('<script type="application/ld+json" data-seojuice="schema">');
    expect(result).toContain('"@type":"Article"');
    expect(result).toContain('"name":"Test"');
  });

  it("leaves structured data out when it fails to parse (fail-open per-transform)", () => {
    const suggestions = createSuggestionResponse({
      structured_data: "not valid json {{{",
    });

    const result = injectSEO({ html: baseHTML, suggestions });

    expect(result).not.toContain("application/ld+json");
  });

  it("injects internal links as real <a> elements in the body with a cs marker", () => {
    const suggestions = createSuggestionResponse({
      suggestions: [{ keyword: "Body content", url: "https://example.com/tools", id: 42 }],
    });

    const result = injectSEO({ html: baseHTML, suggestions });

    expect(result).toContain('<a href="https://example.com/tools" data-seojuice-cs="42">Body content</a>');
    expect(result).not.toContain('id="seojuice-links"');
  });

  it("escapes a keyword containing HTML-significant characters", () => {
    const html = baseHTML.replace(
      "Body content long enough",
      "Tom & Jerry content long enough",
    );
    const suggestions = createSuggestionResponse({
      suggestions: [{ keyword: "Tom & Jerry", url: "https://example.com", id: 1 }],
    });

    const result = injectSEO({ html, suggestions });

    expect(result).toContain(">Tom &amp; Jerry</a>");
  });

  describe("option flags", () => {
    const fullSuggestions = createSuggestionResponse({
      title: "Title",
      meta_description: "Desc",
      og_title: "OG Title",
      og_description: "OG Desc",
      structured_data: '{"@type":"Thing"}',
      suggestions: [{ keyword: "Body content", url: "https://example.com/page", id: 1 }],
    });

    it("does not inject links when injectLinks=false", () => {
      const result = injectSEO({
        html: baseHTML,
        suggestions: fullSuggestions,
        injectLinks: false,
      });

      expect(result).not.toContain("<a href=\"https://example.com/page\"");
      expect(result).toContain("Title</title>");
    });

    it("does not inject meta tags when injectMetaTags=false", () => {
      const result = injectSEO({
        html: baseHTML,
        suggestions: fullSuggestions,
        injectMetaTags: false,
      });

      expect(result).not.toContain("<title");
      expect(result).not.toContain('name="description"');
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
      expect(result).toContain("Title</title>");
    });

    it("does not inject structured data when injectStructuredData=false", () => {
      const result = injectSEO({
        html: baseHTML,
        suggestions: fullSuggestions,
        injectStructuredData: false,
      });

      expect(result).not.toContain("application/ld+json");
      expect(result).toContain("Title</title>");
    });

    it("disables all content transforms when all flags are false, but the SSR flag still lands", () => {
      const result = injectSEO({
        html: baseHTML,
        suggestions: fullSuggestions,
        injectLinks: false,
        injectMetaTags: false,
        injectOGTags: false,
        injectStructuredData: false,
        injectImages: false,
        injectDiffs: false,
        injectH1: false,
        injectBrokenLinks: false,
      });

      expect(result).not.toContain("<title");
      expect(result).not.toContain("application/ld+json");
      expect(result).toContain("window.seojuiceSSR = true;");
    });
  });

  it("handles HTML without </head> gracefully", () => {
    const noHeadHTML = "<html><body><h1>Hello</h1><p>Enough body content here to pass the length check comfortably.</p></body></html>";
    const suggestions = createSuggestionResponse({
      title: "Title",
      meta_description: "Desc",
    });

    const result = injectSEO({ html: noHeadHTML, suggestions });

    expect(result).toContain("<body>");
    expect(result).not.toContain("<title data-seojuice");
  });

  it("fails open (returns original) when there is no <body> tag", () => {
    const noBodyHTML = "<html><head></head><p>Content</p></html>";
    const suggestions = createSuggestionResponse({
      suggestions: [{ keyword: "Content", url: "https://example.com", id: 1 }],
    });

    const result = injectSEO({ html: noBodyHTML, suggestions });

    expect(result).toBe(noBodyHTML);
  });

  it("returns HTML with only the SSR flag when suggestions have no content", () => {
    const suggestions = createSuggestionResponse();
    const result = injectSEO({ html: baseHTML, suggestions });
    expect(result).toBe(baseHTML.replace("</body>", "<script>window.seojuiceSSR = true;</script>\n</body>"));
  });

  it("is idempotent when run twice on its own output", () => {
    const suggestions = createSuggestionResponse({
      title: "My Title",
      suggestions: [{ keyword: "Body content", url: "https://example.com/tools", id: 42 }],
    });
    const once = injectSEO({ html: baseHTML, suggestions });
    const twice = injectSEO({ html: once, suggestions });
    expect(twice).toBe(once);
  });
});

describe("injectResponse", () => {
  it("fetches then injects, fails open on fetch error", async () => {
    const ok = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ errors: [], suggestions: [{ keyword: "SWP", url: "/swp", id: 1 }] }),
    });
    const out = await injectResponse({ html: "<body><p>SWP</p></body>", url: "https://x.com/p", fetch: ok });
    expect(out).toContain('<a href="/swp"');

    const boom = vi.fn().mockRejectedValue(new Error("net"));
    const same = await injectResponse({ html: "<body><p>SWP</p></body>", url: "https://x.com/p", fetch: boom });
    expect(same).toBe("<body><p>SWP</p></body>"); // fail open
  });

  it("derives the /suggestions endpoint from apiBase", async () => {
    const fetchFn = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ errors: [], suggestions: [] }),
    });
    await injectResponse({
      html: "<body></body>",
      url: "https://x.com/p",
      apiBase: "https://custom.seojuice.io",
      fetch: fetchFn,
    });
    const [calledUrl] = fetchFn.mock.calls[0];
    expect(String(calledUrl)).toContain("https://custom.seojuice.io/suggestions?");
  });
});
