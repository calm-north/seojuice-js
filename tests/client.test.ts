import { describe, it, expect, vi } from "vitest";
import { SEOJuice } from "../src/client.js";
import { WebsitesResource } from "../src/resources/websites.js";
import { PagesResource } from "../src/resources/pages.js";
import { IntelligenceResource } from "../src/resources/intelligence.js";
import { ClustersResource } from "../src/resources/clusters.js";
import { ContentResource } from "../src/resources/content.js";
import { CompetitorsResource } from "../src/resources/competitors.js";
import { AISOResource } from "../src/resources/aiso.js";
import { KeywordsResource } from "../src/resources/keywords.js";
import { BacklinksResource } from "../src/resources/backlinks.js";
import { AccessibilityResource } from "../src/resources/accessibility.js";
import { ReportsResource } from "../src/resources/reports.js";
import { AnalysisResource } from "../src/resources/analysis.js";
import { GBPResource } from "../src/resources/gbp.js";
import { LinksResource } from "../src/resources/links.js";
import { SimilarResource } from "../src/resources/similar.js";

const mockFetch = vi.fn();

describe("SEOJuice client", () => {
  it("creates all 15 resource properties", () => {
    const client = new SEOJuice({ apiKey: "test-key", fetch: mockFetch });

    expect(client.websites).toBeInstanceOf(WebsitesResource);
    expect(client.pages).toBeInstanceOf(PagesResource);
    expect(client.links).toBeInstanceOf(LinksResource);
    expect(client.intelligence).toBeInstanceOf(IntelligenceResource);
    expect(client.clusters).toBeInstanceOf(ClustersResource);
    expect(client.content).toBeInstanceOf(ContentResource);
    expect(client.competitors).toBeInstanceOf(CompetitorsResource);
    expect(client.aiso).toBeInstanceOf(AISOResource);
    expect(client.keywords).toBeInstanceOf(KeywordsResource);
    expect(client.backlinks).toBeInstanceOf(BacklinksResource);
    expect(client.accessibility).toBeInstanceOf(AccessibilityResource);
    expect(client.reports).toBeInstanceOf(ReportsResource);
    expect(client.analysis).toBeInstanceOf(AnalysisResource);
    expect(client.similar).toBeInstanceOf(SimilarResource);
    expect(client.gbp).toBeInstanceOf(GBPResource);
  });

  it("passes custom config values through to HttpClient", async () => {
    const customFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers(),
      json: vi.fn().mockResolvedValue([]),
    } as unknown as Response);

    const client = new SEOJuice({
      apiKey: "custom-key",
      baseURL: "https://custom.example.com/api",
      timeout: 60000,
      fetch: customFetch,
    });

    await client.websites.list();

    const [url, options] = customFetch.mock.calls[0];
    expect(url).toBe("https://custom.example.com/api/websites/");
    expect(options.headers.Authorization).toBe("Bearer custom-key");
  });

  it("defaults baseURL to https://seojuice.com/api/v2", async () => {
    const customFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers(),
      json: vi.fn().mockResolvedValue([]),
    } as unknown as Response);

    const client = new SEOJuice({
      apiKey: "key",
      fetch: customFetch,
    });

    await client.websites.list();

    const [url] = customFetch.mock.calls[0];
    expect(url).toBe("https://seojuice.com/api/v2/websites/");
  });

  it("binds globalThis.fetch when none provided", () => {
    const originalFetch = globalThis.fetch;
    const fakeFetch = vi.fn();
    globalThis.fetch = fakeFetch;

    try {
      // Should not throw even when no fetch option is provided
      const client = new SEOJuice({ apiKey: "key" });
      expect(client).toBeDefined();
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
