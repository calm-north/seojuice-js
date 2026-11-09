import { describe, it, expect, vi, beforeEach } from "vitest";
import { WebsitesResource } from "../../src/resources/websites.js";
import type { HttpClient } from "../../src/http.js";

describe("WebsitesResource", () => {
  let mockHttp: { request: ReturnType<typeof vi.fn> };
  let websites: WebsitesResource;

  beforeEach(() => {
    mockHttp = { request: vi.fn() };
    websites = new WebsitesResource(mockHttp as unknown as HttpClient);
  });

  describe("list", () => {
    it("calls GET /websites/", async () => {
      const data = { results: [{ domain: "example.com", created_at: "2026-01-01T00:00:00Z" }] };
      mockHttp.request.mockResolvedValue(data);

      const result = await websites.list();

      expect(mockHttp.request).toHaveBeenCalledWith("/websites/");
      expect(result).toEqual(data);
    });
  });

  describe("get", () => {
    it("calls GET /websites/{domain}/", async () => {
      const data = { domain: "example.com", status: "active" };
      mockHttp.request.mockResolvedValue(data);

      const result = await websites.get("example.com");

      expect(mockHttp.request).toHaveBeenCalledWith("/websites/example.com/");
      expect(result).toEqual(data);
    });

    it("encodes domain in URL path", async () => {
      mockHttp.request.mockResolvedValue({});

      await websites.get("my-site.co.uk");

      expect(mockHttp.request).toHaveBeenCalledWith("/websites/my-site.co.uk/");
    });
  });
});
