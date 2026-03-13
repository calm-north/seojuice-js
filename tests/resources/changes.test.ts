import { describe, it, expect, vi, beforeEach } from "vitest";
import { ChangesResource } from "../../src/resources/changes.js";
import type { HttpClient } from "../../src/http.js";
import type {
  BulkActionResult,
  ChangeRecord,
  ChangeSettings,
  ChangeStats,
} from "../../src/types/changes.js";
import type { PaginatedResult } from "../../src/types/common.js";

function createMockChange(overrides: Partial<ChangeRecord> = {}): ChangeRecord {
  return {
    id: 1,
    change_type: "internal_link",
    status: "pending",
    page_url: "/blog/test-post",
    proposed_value: '<a href="/about">About Us</a>',
    previous_value: null,
    reason: "Improves internal linking structure",
    confidence_score: 0.85,
    anchor_text: "About Us",
    alternatives: [],
    original_issues: [],
    optimization_techniques: ["internal_linking"],
    seo_signals_improved: ["crawl_depth"],
    potential_risks: [],
    related_changes: [],
    llm_metadata: {},
    created_at: "2026-03-10T12:00:00Z",
    reviewed_at: null,
    applied_at: null,
    pulled_at: null,
    pulled_by_integration: null,
    verified_at: null,
    reverted_at: null,
    revert_reason: null,
    ...overrides,
  };
}

function createPaginatedChanges(
  items: ChangeRecord[],
  page = 1,
  totalCount?: number,
): PaginatedResult<ChangeRecord> {
  const count = totalCount ?? items.length;
  return {
    results: items,
    pagination: {
      page,
      page_size: 20,
      total_count: count,
      total_pages: Math.max(1, Math.ceil(count / 20)),
    },
  };
}

describe("ChangesResource", () => {
  let mockHttp: { request: ReturnType<typeof vi.fn> };
  let changes: ChangesResource;

  beforeEach(() => {
    mockHttp = { request: vi.fn() };
    changes = new ChangesResource(mockHttp as unknown as HttpClient);
  });

  // ---------------------------------------------------------------------------
  // list
  // ---------------------------------------------------------------------------
  describe("list", () => {
    it("returns paginated changes for a domain", async () => {
      const data = createPaginatedChanges([createMockChange()]);
      mockHttp.request.mockResolvedValue(data);

      const result = await changes.list("example.com");

      expect(mockHttp.request).toHaveBeenCalledWith(
        "/websites/example.com/changes/",
        { query: {} },
      );
      expect(result).toEqual(data);
    });

    it("passes status filter as query param", async () => {
      mockHttp.request.mockResolvedValue(createPaginatedChanges([]));

      await changes.list("example.com", { status: "pending" });

      expect(mockHttp.request).toHaveBeenCalledWith(
        "/websites/example.com/changes/",
        { query: { status: "pending" } },
      );
    });

    it("passes change_type filter", async () => {
      mockHttp.request.mockResolvedValue(createPaginatedChanges([]));

      await changes.list("example.com", { change_type: "internal_link" });

      expect(mockHttp.request).toHaveBeenCalledWith(
        "/websites/example.com/changes/",
        { query: { change_type: "internal_link" } },
      );
    });

    it("passes url filter", async () => {
      mockHttp.request.mockResolvedValue(createPaginatedChanges([]));

      await changes.list("example.com", { url: "/blog/my-post" });

      expect(mockHttp.request).toHaveBeenCalledWith(
        "/websites/example.com/changes/",
        { query: { url: "/blog/my-post" } },
      );
    });

    it("passes multiple filters combined", async () => {
      mockHttp.request.mockResolvedValue(createPaginatedChanges([]));

      await changes.list("example.com", {
        status: "approved",
        change_type: "meta_description",
        url: "/about",
      });

      expect(mockHttp.request).toHaveBeenCalledWith(
        "/websites/example.com/changes/",
        {
          query: {
            status: "approved",
            change_type: "meta_description",
            url: "/about",
          },
        },
      );
    });

    it("passes custom page_size", async () => {
      mockHttp.request.mockResolvedValue(createPaginatedChanges([]));

      await changes.list("example.com", { page_size: 50 });

      expect(mockHttp.request).toHaveBeenCalledWith(
        "/websites/example.com/changes/",
        { query: { page_size: 50 } },
      );
    });

    it("passes page number", async () => {
      mockHttp.request.mockResolvedValue(createPaginatedChanges([]));

      await changes.list("example.com", { page: 3 });

      expect(mockHttp.request).toHaveBeenCalledWith(
        "/websites/example.com/changes/",
        { query: { page: 3 } },
      );
    });

    it("returns empty results when no changes", async () => {
      const data = createPaginatedChanges([], 1, 0);
      mockHttp.request.mockResolvedValue(data);

      const result = await changes.list("example.com");

      expect(result.results).toEqual([]);
      expect(result.pagination.total_count).toBe(0);
    });

    it("throws on invalid domain", async () => {
      await expect(changes.list("")).rejects.toThrow(TypeError);
      await expect(changes.list("bad domain")).rejects.toThrow(TypeError);
    });
  });

  // ---------------------------------------------------------------------------
  // get
  // ---------------------------------------------------------------------------
  describe("get", () => {
    it("returns single change by ID", async () => {
      const change = createMockChange({ id: 42 });
      mockHttp.request.mockResolvedValue(change);

      const result = await changes.get("example.com", 42);

      expect(mockHttp.request).toHaveBeenCalledWith(
        "/websites/example.com/changes/42/",
      );
      expect(result).toEqual(change);
    });

    it("throws on invalid domain", async () => {
      await expect(changes.get("", 1)).rejects.toThrow(TypeError);
    });

    it("throws on invalid ID (NaN)", async () => {
      await expect(changes.get("example.com", NaN)).rejects.toThrow(TypeError);
    });
  });

  // ---------------------------------------------------------------------------
  // stats
  // ---------------------------------------------------------------------------
  describe("stats", () => {
    it("returns aggregated counts", async () => {
      const data: ChangeStats = {
        by_status: { pending: 5, approved: 10, applied: 3 },
        by_type: { internal_link: 8, meta_description: 10 },
      };
      mockHttp.request.mockResolvedValue(data);

      const result = await changes.stats("example.com");

      expect(mockHttp.request).toHaveBeenCalledWith(
        "/websites/example.com/changes/stats/",
      );
      expect(result).toEqual(data);
    });

    it("throws on invalid domain", async () => {
      await expect(changes.stats("bad/domain")).rejects.toThrow(TypeError);
    });
  });

  // ---------------------------------------------------------------------------
  // settings
  // ---------------------------------------------------------------------------
  describe("settings", () => {
    const mockSettings: ChangeSettings = {
      internal_links_mode: "suggest",
      meta_tags_mode: "auto_deploy",
      og_tags_mode: "off",
      title_tags_mode: "manual_deploy",
      structured_data_mode: "suggest",
      image_alt_mode: "suggest",
      accessibility_mode: "off",
      local_seo_mode: "off",
      gbp_review_reply_mode: "off",
      max_changes_per_page_per_day: 5,
      max_changes_per_day: 100,
      exclude_paths: "/admin/*\n/staging/*",
    };

    it("returns automation settings", async () => {
      mockHttp.request.mockResolvedValue(mockSettings);

      const result = await changes.settings("example.com");

      expect(mockHttp.request).toHaveBeenCalledWith(
        "/websites/example.com/changes/settings/",
      );
      expect(result).toEqual(mockSettings);
    });

    it("throws on invalid domain", async () => {
      await expect(changes.settings("")).rejects.toThrow(TypeError);
    });

    it("throws on domain with path traversal", async () => {
      await expect(changes.settings("../etc/passwd")).rejects.toThrow(TypeError);
    });

    it("throws on domain with query injection", async () => {
      await expect(changes.settings("example.com?admin=true")).rejects.toThrow(
        TypeError,
      );
    });
  });

  // ---------------------------------------------------------------------------
  // updateSettings
  // ---------------------------------------------------------------------------
  describe("updateSettings", () => {
    it("sends PATCH with partial settings (mode change)", async () => {
      const updated: ChangeSettings = {
        internal_links_mode: "auto_deploy",
        meta_tags_mode: "auto_deploy",
        og_tags_mode: "off",
        title_tags_mode: "manual_deploy",
        structured_data_mode: "suggest",
        image_alt_mode: "suggest",
        accessibility_mode: "off",
        local_seo_mode: "off",
        gbp_review_reply_mode: "off",
        max_changes_per_page_per_day: 5,
        max_changes_per_day: 100,
        exclude_paths: "",
      };
      mockHttp.request.mockResolvedValue(updated);

      const result = await changes.updateSettings("example.com", {
        internal_links_mode: "auto_deploy",
      });

      expect(mockHttp.request).toHaveBeenCalledWith(
        "/websites/example.com/changes/settings/",
        { method: "PATCH", body: { internal_links_mode: "auto_deploy" } },
      );
      expect(result).toEqual(updated);
    });

    it("sends PATCH with budget fields", async () => {
      mockHttp.request.mockResolvedValue({});

      await changes.updateSettings("example.com", {
        max_changes_per_page_per_day: 10,
        max_changes_per_day: 200,
      });

      expect(mockHttp.request).toHaveBeenCalledWith(
        "/websites/example.com/changes/settings/",
        {
          method: "PATCH",
          body: { max_changes_per_page_per_day: 10, max_changes_per_day: 200 },
        },
      );
    });

    it("sends PATCH with exclude_paths", async () => {
      mockHttp.request.mockResolvedValue({});

      await changes.updateSettings("example.com", {
        exclude_paths: "/admin/*\n/staging/*\n/api/*",
      });

      expect(mockHttp.request).toHaveBeenCalledWith(
        "/websites/example.com/changes/settings/",
        {
          method: "PATCH",
          body: { exclude_paths: "/admin/*\n/staging/*\n/api/*" },
        },
      );
    });

    it("throws on invalid domain", async () => {
      await expect(
        changes.updateSettings("", { internal_links_mode: "off" }),
      ).rejects.toThrow(TypeError);
    });
  });

  // ---------------------------------------------------------------------------
  // approve
  // ---------------------------------------------------------------------------
  describe("approve", () => {
    it("sends POST to approve endpoint and returns updated record", async () => {
      const approved = createMockChange({
        id: 10,
        status: "approved",
        reviewed_at: "2026-03-10T13:00:00Z",
      });
      mockHttp.request.mockResolvedValue(approved);

      const result = await changes.approve("example.com", 10);

      expect(mockHttp.request).toHaveBeenCalledWith(
        "/websites/example.com/changes/10/approve/",
        { method: "POST" },
      );
      expect(result).toEqual(approved);
    });

    it("throws on invalid domain", async () => {
      await expect(changes.approve("", 10)).rejects.toThrow(TypeError);
    });

    it("throws on invalid ID", async () => {
      await expect(changes.approve("example.com", Infinity)).rejects.toThrow(
        TypeError,
      );
    });
  });

  // ---------------------------------------------------------------------------
  // reject
  // ---------------------------------------------------------------------------
  describe("reject", () => {
    it("sends POST with reason", async () => {
      const rejected = createMockChange({
        id: 5,
        status: "rejected",
        reviewed_at: "2026-03-10T13:00:00Z",
      });
      mockHttp.request.mockResolvedValue(rejected);

      const result = await changes.reject("example.com", 5, {
        reason: "Not relevant to this page",
      });

      expect(mockHttp.request).toHaveBeenCalledWith(
        "/websites/example.com/changes/5/reject/",
        { method: "POST", body: { reason: "Not relevant to this page" } },
      );
      expect(result).toEqual(rejected);
    });

    it("sends POST without reason (undefined body)", async () => {
      mockHttp.request.mockResolvedValue(createMockChange({ status: "rejected" }));

      await changes.reject("example.com", 5);

      expect(mockHttp.request).toHaveBeenCalledWith(
        "/websites/example.com/changes/5/reject/",
        { method: "POST", body: undefined },
      );
    });

    it("throws on invalid domain", async () => {
      await expect(changes.reject("bad domain", 1)).rejects.toThrow(TypeError);
    });
  });

  // ---------------------------------------------------------------------------
  // revert
  // ---------------------------------------------------------------------------
  describe("revert", () => {
    it("sends POST with reason", async () => {
      const reverted = createMockChange({
        id: 7,
        status: "reverted",
        reverted_at: "2026-03-10T14:00:00Z",
        revert_reason: "Caused layout issues",
      });
      mockHttp.request.mockResolvedValue(reverted);

      const result = await changes.revert("example.com", 7, {
        reason: "Caused layout issues",
      });

      expect(mockHttp.request).toHaveBeenCalledWith(
        "/websites/example.com/changes/7/revert/",
        { method: "POST", body: { reason: "Caused layout issues" } },
      );
      expect(result).toEqual(reverted);
    });

    it("sends POST without reason", async () => {
      mockHttp.request.mockResolvedValue(createMockChange({ status: "reverted" }));

      await changes.revert("example.com", 7);

      expect(mockHttp.request).toHaveBeenCalledWith(
        "/websites/example.com/changes/7/revert/",
        { method: "POST", body: undefined },
      );
    });

    it("throws on invalid ID", async () => {
      await expect(
        changes.revert("example.com", -Infinity),
      ).rejects.toThrow(TypeError);
    });
  });

  // ---------------------------------------------------------------------------
  // pull
  // ---------------------------------------------------------------------------
  describe("pull", () => {
    it("sends POST with integration name", async () => {
      const pulled = createMockChange({
        id: 15,
        status: "pulled",
        pulled_at: "2026-03-10T15:00:00Z",
        pulled_by_integration: "api",
      });
      mockHttp.request.mockResolvedValue(pulled);

      const result = await changes.pull("example.com", 15, {
        integration: "api",
      });

      expect(mockHttp.request).toHaveBeenCalledWith(
        "/websites/example.com/changes/15/pull/",
        { method: "POST", body: { integration: "api" } },
      );
      expect(result).toEqual(pulled);
    });

    it("sends POST with wordpress integration", async () => {
      mockHttp.request.mockResolvedValue(
        createMockChange({
          status: "pulled",
          pulled_by_integration: "wordpress",
        }),
      );

      await changes.pull("example.com", 20, { integration: "wordpress" });

      expect(mockHttp.request).toHaveBeenCalledWith(
        "/websites/example.com/changes/20/pull/",
        { method: "POST", body: { integration: "wordpress" } },
      );
    });

    it("throws on invalid domain", async () => {
      await expect(
        changes.pull("", 1, { integration: "api" }),
      ).rejects.toThrow(TypeError);
    });

    it("throws on invalid ID", async () => {
      await expect(
        changes.pull("example.com", NaN, { integration: "api" }),
      ).rejects.toThrow(TypeError);
    });
  });

  // ---------------------------------------------------------------------------
  // verify
  // ---------------------------------------------------------------------------
  describe("verify", () => {
    it("sends POST with integration name", async () => {
      const verified = createMockChange({
        id: 15,
        status: "verified",
        verified_at: "2026-03-10T16:00:00Z",
      });
      mockHttp.request.mockResolvedValue(verified);

      const result = await changes.verify("example.com", 15, {
        integration: "api",
      });

      expect(mockHttp.request).toHaveBeenCalledWith(
        "/websites/example.com/changes/15/verify/",
        { method: "POST", body: { integration: "api" } },
      );
      expect(result).toEqual(verified);
    });

    it("throws on invalid domain", async () => {
      await expect(
        changes.verify("bad/domain", 1, { integration: "api" }),
      ).rejects.toThrow(TypeError);
    });

    it("throws on invalid ID", async () => {
      await expect(
        changes.verify("example.com", Infinity, { integration: "api" }),
      ).rejects.toThrow(TypeError);
    });
  });

  // ---------------------------------------------------------------------------
  // bulk
  // ---------------------------------------------------------------------------
  describe("bulk", () => {
    it("bulk approves multiple changes", async () => {
      const result: BulkActionResult = {
        action: "approve",
        succeeded: [1, 2, 3],
        failed: [],
        total_succeeded: 3,
        total_failed: 0,
      };
      mockHttp.request.mockResolvedValue(result);

      const response = await changes.bulk("example.com", {
        action: "approve",
        ids: [1, 2, 3],
      });

      expect(mockHttp.request).toHaveBeenCalledWith(
        "/websites/example.com/changes/bulk/",
        { method: "POST", body: { action: "approve", ids: [1, 2, 3] } },
      );
      expect(response).toEqual(result);
    });

    it("bulk rejects with reason", async () => {
      mockHttp.request.mockResolvedValue({
        action: "reject",
        succeeded: [4, 5],
        failed: [],
        total_succeeded: 2,
        total_failed: 0,
      });

      await changes.bulk("example.com", {
        action: "reject",
        ids: [4, 5],
        reason: "Bulk rejected: low quality",
      });

      expect(mockHttp.request).toHaveBeenCalledWith(
        "/websites/example.com/changes/bulk/",
        {
          method: "POST",
          body: {
            action: "reject",
            ids: [4, 5],
            reason: "Bulk rejected: low quality",
          },
        },
      );
    });

    it("bulk reverts with reason", async () => {
      mockHttp.request.mockResolvedValue({
        action: "revert",
        succeeded: [10],
        failed: [],
        total_succeeded: 1,
        total_failed: 0,
      });

      await changes.bulk("example.com", {
        action: "revert",
        ids: [10],
        reason: "Regression found",
      });

      expect(mockHttp.request).toHaveBeenCalledWith(
        "/websites/example.com/changes/bulk/",
        {
          method: "POST",
          body: { action: "revert", ids: [10], reason: "Regression found" },
        },
      );
    });

    it("bulk pulls with integration", async () => {
      mockHttp.request.mockResolvedValue({
        action: "pull",
        succeeded: [1, 2],
        failed: [],
        total_succeeded: 2,
        total_failed: 0,
      });

      await changes.bulk("example.com", {
        action: "pull",
        ids: [1, 2],
        integration: "wordpress",
      });

      expect(mockHttp.request).toHaveBeenCalledWith(
        "/websites/example.com/changes/bulk/",
        {
          method: "POST",
          body: { action: "pull", ids: [1, 2], integration: "wordpress" },
        },
      );
    });

    it("bulk verifies with integration", async () => {
      mockHttp.request.mockResolvedValue({
        action: "verify",
        succeeded: [3, 4],
        failed: [],
        total_succeeded: 2,
        total_failed: 0,
      });

      await changes.bulk("example.com", {
        action: "verify",
        ids: [3, 4],
        integration: "api",
      });

      expect(mockHttp.request).toHaveBeenCalledWith(
        "/websites/example.com/changes/bulk/",
        {
          method: "POST",
          body: { action: "verify", ids: [3, 4], integration: "api" },
        },
      );
    });

    it("handles partial failure response", async () => {
      const result: BulkActionResult = {
        action: "approve",
        succeeded: [1, 3],
        failed: [{ id: 2, error: "Change already rejected" }],
        total_succeeded: 2,
        total_failed: 1,
      };
      mockHttp.request.mockResolvedValue(result);

      const response = await changes.bulk("example.com", {
        action: "approve",
        ids: [1, 2, 3],
      });

      expect(response.total_succeeded).toBe(2);
      expect(response.total_failed).toBe(1);
      expect(response.failed).toHaveLength(1);
      expect(response.failed[0]).toEqual({
        id: 2,
        error: "Change already rejected",
      });
    });

    it("handles all-failed response", async () => {
      const result: BulkActionResult = {
        action: "approve",
        succeeded: [],
        failed: [
          { id: 1, error: "Not found" },
          { id: 2, error: "Not found" },
        ],
        total_succeeded: 0,
        total_failed: 2,
      };
      mockHttp.request.mockResolvedValue(result);

      const response = await changes.bulk("example.com", {
        action: "approve",
        ids: [1, 2],
      });

      expect(response.succeeded).toEqual([]);
      expect(response.total_succeeded).toBe(0);
      expect(response.total_failed).toBe(2);
    });

    it("throws on invalid domain", async () => {
      await expect(
        changes.bulk("", { action: "approve", ids: [1] }),
      ).rejects.toThrow(TypeError);
    });
  });

  // ---------------------------------------------------------------------------
  // workflows (sequential mock chains)
  // ---------------------------------------------------------------------------
  describe("workflows", () => {
    it("full lifecycle: list -> approve -> pull -> verify", async () => {
      const pending = createMockChange({ id: 1, status: "pending" });
      const approved = createMockChange({
        id: 1,
        status: "approved",
        reviewed_at: "2026-03-10T13:00:00Z",
      });
      const pulled = createMockChange({
        id: 1,
        status: "pulled",
        pulled_at: "2026-03-10T14:00:00Z",
        pulled_by_integration: "wordpress",
      });
      const verified = createMockChange({
        id: 1,
        status: "verified",
        verified_at: "2026-03-10T15:00:00Z",
      });

      mockHttp.request
        .mockResolvedValueOnce(createPaginatedChanges([pending]))
        .mockResolvedValueOnce(approved)
        .mockResolvedValueOnce(pulled)
        .mockResolvedValueOnce(verified);

      const listed = await changes.list("example.com", { status: "pending" });
      expect(listed.results).toHaveLength(1);

      const approvedResult = await changes.approve("example.com", 1);
      expect(approvedResult.status).toBe("approved");

      const pulledResult = await changes.pull("example.com", 1, {
        integration: "wordpress",
      });
      expect(pulledResult.status).toBe("pulled");

      const verifiedResult = await changes.verify("example.com", 1, {
        integration: "wordpress",
      });
      expect(verifiedResult.status).toBe("verified");

      expect(mockHttp.request).toHaveBeenCalledTimes(4);
    });

    it("full lifecycle: list -> reject", async () => {
      const pending = createMockChange({ id: 2, status: "pending" });
      const rejected = createMockChange({
        id: 2,
        status: "rejected",
        reviewed_at: "2026-03-10T13:00:00Z",
      });

      mockHttp.request
        .mockResolvedValueOnce(createPaginatedChanges([pending]))
        .mockResolvedValueOnce(rejected);

      const listed = await changes.list("example.com");
      const change = listed.results[0];

      const result = await changes.reject("example.com", change.id, {
        reason: "Not needed",
      });
      expect(result.status).toBe("rejected");
      expect(mockHttp.request).toHaveBeenCalledTimes(2);
    });

    it("full lifecycle: approve -> revert", async () => {
      const approved = createMockChange({ id: 3, status: "approved" });
      const reverted = createMockChange({
        id: 3,
        status: "reverted",
        reverted_at: "2026-03-10T14:00:00Z",
        revert_reason: "Caused issues",
      });

      mockHttp.request
        .mockResolvedValueOnce(approved)
        .mockResolvedValueOnce(reverted);

      const approveResult = await changes.approve("example.com", 3);
      expect(approveResult.status).toBe("approved");

      const revertResult = await changes.revert("example.com", 3, {
        reason: "Caused issues",
      });
      expect(revertResult.status).toBe("reverted");
      expect(revertResult.revert_reason).toBe("Caused issues");
    });

    it("settings round-trip: get -> update -> get", async () => {
      const original: ChangeSettings = {
        internal_links_mode: "suggest",
        meta_tags_mode: "suggest",
        og_tags_mode: "off",
        title_tags_mode: "off",
        structured_data_mode: "off",
        image_alt_mode: "off",
        accessibility_mode: "off",
        local_seo_mode: "off",
        gbp_review_reply_mode: "off",
        max_changes_per_page_per_day: 5,
        max_changes_per_day: 50,
        exclude_paths: "",
      };
      const updated: ChangeSettings = {
        ...original,
        internal_links_mode: "auto_deploy",
        max_changes_per_day: 200,
      };

      mockHttp.request
        .mockResolvedValueOnce(original)
        .mockResolvedValueOnce(updated)
        .mockResolvedValueOnce(updated);

      const initial = await changes.settings("example.com");
      expect(initial.internal_links_mode).toBe("suggest");

      const patched = await changes.updateSettings("example.com", {
        internal_links_mode: "auto_deploy",
        max_changes_per_day: 200,
      });
      expect(patched.internal_links_mode).toBe("auto_deploy");

      const refetched = await changes.settings("example.com");
      expect(refetched.max_changes_per_day).toBe(200);

      expect(mockHttp.request).toHaveBeenCalledTimes(3);
    });

    it("bulk approve then bulk pull", async () => {
      const approveResult: BulkActionResult = {
        action: "approve",
        succeeded: [1, 2, 3],
        failed: [],
        total_succeeded: 3,
        total_failed: 0,
      };
      const pullResult: BulkActionResult = {
        action: "pull",
        succeeded: [1, 2, 3],
        failed: [],
        total_succeeded: 3,
        total_failed: 0,
      };

      mockHttp.request
        .mockResolvedValueOnce(approveResult)
        .mockResolvedValueOnce(pullResult);

      const approved = await changes.bulk("example.com", {
        action: "approve",
        ids: [1, 2, 3],
      });
      expect(approved.total_succeeded).toBe(3);

      const pulled = await changes.bulk("example.com", {
        action: "pull",
        ids: approved.succeeded,
        integration: "api",
      });
      expect(pulled.total_succeeded).toBe(3);

      expect(mockHttp.request).toHaveBeenCalledTimes(2);
    });
  });

  // ---------------------------------------------------------------------------
  // domain encoding
  // ---------------------------------------------------------------------------
  describe("domain encoding", () => {
    it("handles domains with subdomains", async () => {
      mockHttp.request.mockResolvedValue(createPaginatedChanges([]));

      await changes.list("blog.sub.example.com");

      expect(mockHttp.request).toHaveBeenCalledWith(
        "/websites/blog.sub.example.com/changes/",
        { query: {} },
      );
    });

    it("handles domains with hyphens", async () => {
      mockHttp.request.mockResolvedValue(createPaginatedChanges([]));

      await changes.list("my-cool-site.co.uk");

      expect(mockHttp.request).toHaveBeenCalledWith(
        "/websites/my-cool-site.co.uk/changes/",
        { query: {} },
      );
    });
  });

  // ---------------------------------------------------------------------------
  // response shape
  // ---------------------------------------------------------------------------
  describe("response shape", () => {
    it("change record includes all expected fields", async () => {
      const change = createMockChange();
      mockHttp.request.mockResolvedValue(change);

      const result = await changes.get("example.com", 1);

      expect(result).toHaveProperty("id");
      expect(result).toHaveProperty("change_type");
      expect(result).toHaveProperty("status");
      expect(result).toHaveProperty("page_url");
      expect(result).toHaveProperty("proposed_value");
      expect(result).toHaveProperty("previous_value");
      expect(result).toHaveProperty("reason");
      expect(result).toHaveProperty("confidence_score");
      expect(result).toHaveProperty("anchor_text");
      expect(result).toHaveProperty("alternatives");
      expect(result).toHaveProperty("original_issues");
      expect(result).toHaveProperty("optimization_techniques");
      expect(result).toHaveProperty("seo_signals_improved");
      expect(result).toHaveProperty("potential_risks");
      expect(result).toHaveProperty("related_changes");
      expect(result).toHaveProperty("llm_metadata");
      expect(result).toHaveProperty("created_at");
      expect(result).toHaveProperty("reviewed_at");
      expect(result).toHaveProperty("applied_at");
      expect(result).toHaveProperty("pulled_at");
      expect(result).toHaveProperty("pulled_by_integration");
      expect(result).toHaveProperty("verified_at");
      expect(result).toHaveProperty("reverted_at");
      expect(result).toHaveProperty("revert_reason");
    });

    it("change record with null page_url", async () => {
      const change = createMockChange({ page_url: null });
      mockHttp.request.mockResolvedValue(change);

      const result = await changes.get("example.com", 1);

      expect(result.page_url).toBeNull();
    });

    it("change record with all null optional fields", async () => {
      const change = createMockChange({
        page_url: null,
        proposed_value: null,
        previous_value: null,
        reason: null,
        confidence_score: null,
        anchor_text: null,
        reviewed_at: null,
        applied_at: null,
        pulled_at: null,
        pulled_by_integration: null,
        verified_at: null,
        reverted_at: null,
        revert_reason: null,
      });
      mockHttp.request.mockResolvedValue(change);

      const result = await changes.get("example.com", 1);

      expect(result.page_url).toBeNull();
      expect(result.proposed_value).toBeNull();
      expect(result.previous_value).toBeNull();
      expect(result.reason).toBeNull();
      expect(result.confidence_score).toBeNull();
      expect(result.anchor_text).toBeNull();
      expect(result.reviewed_at).toBeNull();
      expect(result.applied_at).toBeNull();
      expect(result.pulled_at).toBeNull();
      expect(result.pulled_by_integration).toBeNull();
      expect(result.verified_at).toBeNull();
      expect(result.reverted_at).toBeNull();
      expect(result.revert_reason).toBeNull();
    });

    it("bulk result includes failed array with error details", async () => {
      const result: BulkActionResult = {
        action: "approve",
        succeeded: [1],
        failed: [
          { id: 2, error: "Already approved" },
          { id: 3, error: "Not found" },
        ],
        total_succeeded: 1,
        total_failed: 2,
      };
      mockHttp.request.mockResolvedValue(result);

      const response = await changes.bulk("example.com", {
        action: "approve",
        ids: [1, 2, 3],
      });

      expect(response.failed).toHaveLength(2);
      expect(response.failed[0]).toHaveProperty("id", 2);
      expect(response.failed[0]).toHaveProperty("error", "Already approved");
      expect(response.failed[1]).toHaveProperty("id", 3);
      expect(response.failed[1]).toHaveProperty("error", "Not found");
    });

    it("stats response includes all groupings", async () => {
      const data: ChangeStats = {
        by_status: {
          pending: 10,
          approved: 5,
          applied: 3,
          pulled: 2,
          verified: 1,
          rejected: 4,
          reverted: 1,
          expired: 0,
        },
        by_type: {
          internal_link: 12,
          meta_description: 5,
          title_tag: 3,
          structured_data: 2,
          image_alt: 4,
        },
      };
      mockHttp.request.mockResolvedValue(data);

      const result = await changes.stats("example.com");

      expect(result).toHaveProperty("by_status");
      expect(result).toHaveProperty("by_type");
      expect(result.by_status).toHaveProperty("pending");
      expect(result.by_status).toHaveProperty("approved");
      expect(result.by_type).toHaveProperty("internal_link");
    });
  });
});
