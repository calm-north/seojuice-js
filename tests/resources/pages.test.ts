import { describe, it, expect, vi, beforeEach } from "vitest";
import { PagesResource } from "../../src/resources/pages.js";
import type { HttpClient } from "../../src/http.js";

describe("PagesResource", () => {
  let mockHttp: { request: ReturnType<typeof vi.fn> };
  let pages: PagesResource;

  beforeEach(() => {
    mockHttp = { request: vi.fn() };
    pages = new PagesResource(mockHttp as unknown as HttpClient);
  });

  describe("list", () => {
    it("calls GET /websites/{domain}/pages/", async () => {
      const data = { results: [], pagination: { page: 1, total_pages: 1, total_count: 0, page_size: 10 } };
      mockHttp.request.mockResolvedValue(data);

      const result = await pages.list("example.com");

      expect(mockHttp.request).toHaveBeenCalledWith(
        "/websites/example.com/pages/",
        { query: {} },
      );
      expect(result).toEqual(data);
    });

    it("passes pagination params", async () => {
      mockHttp.request.mockResolvedValue({ results: [], pagination: {} });

      await pages.list("example.com", { page: 2, page_size: 25 });

      expect(mockHttp.request).toHaveBeenCalledWith(
        "/websites/example.com/pages/",
        { query: { page: 2, page_size: 25 } },
      );
    });
  });

  describe("get", () => {
    it("calls GET /websites/{domain}/pages/{id}/", async () => {
      const data = { id: 42, url: "/about" };
      mockHttp.request.mockResolvedValue(data);

      const result = await pages.get("example.com", 42);

      expect(mockHttp.request).toHaveBeenCalledWith(
        "/websites/example.com/pages/42/",
      );
      expect(result).toEqual(data);
    });
  });

  describe("listKeywords", () => {
    it("calls GET /websites/{domain}/pages/{id}/keywords/", async () => {
      mockHttp.request.mockResolvedValue({ results: [], pagination: {} });

      await pages.listKeywords("example.com", 10);

      expect(mockHttp.request).toHaveBeenCalledWith(
        "/websites/example.com/pages/10/keywords/",
        { query: {} },
      );
    });

    it("passes pagination params", async () => {
      mockHttp.request.mockResolvedValue({ results: [], pagination: {} });

      await pages.listKeywords("example.com", 10, { page: 3, page_size: 50 });

      expect(mockHttp.request).toHaveBeenCalledWith(
        "/websites/example.com/pages/10/keywords/",
        { query: { page: 3, page_size: 50 } },
      );
    });
  });

  describe("listSearchStats", () => {
    it("calls GET /websites/{domain}/pages/{id}/search-stats/", async () => {
      mockHttp.request.mockResolvedValue({ results: [], pagination: {} });

      await pages.listSearchStats("example.com", 5);

      expect(mockHttp.request).toHaveBeenCalledWith(
        "/websites/example.com/pages/5/search-stats/",
        { query: {} },
      );
    });

    it("passes pagination params", async () => {
      mockHttp.request.mockResolvedValue({ results: [], pagination: {} });

      await pages.listSearchStats("example.com", 5, { page: 2 });

      expect(mockHttp.request).toHaveBeenCalledWith(
        "/websites/example.com/pages/5/search-stats/",
        { query: { page: 2 } },
      );
    });
  });

  describe("listMetricsHistory", () => {
    it("calls GET /websites/{domain}/pages/{id}/metrics-history/", async () => {
      mockHttp.request.mockResolvedValue({ results: [], pagination: {} });

      await pages.listMetricsHistory("example.com", 7);

      expect(mockHttp.request).toHaveBeenCalledWith(
        "/websites/example.com/pages/7/metrics-history/",
        { query: {} },
      );
    });

    it("passes pagination params", async () => {
      mockHttp.request.mockResolvedValue({ results: [], pagination: {} });

      await pages.listMetricsHistory("example.com", 7, { page: 1, page_size: 100 });

      expect(mockHttp.request).toHaveBeenCalledWith(
        "/websites/example.com/pages/7/metrics-history/",
        { query: { page: 1, page_size: 100 } },
      );
    });
  });
});
