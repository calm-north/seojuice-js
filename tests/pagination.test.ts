import { describe, it, expect, vi } from "vitest";
import { PaginatedResponse, autoPaginate } from "../src/pagination.js";
import type { PaginatedResult } from "../src/types/common.js";

function createPaginatedResult<T>(
  results: T[],
  page: number,
  totalPages: number,
  totalCount: number,
  pageSize = 10,
): PaginatedResult<T> {
  return {
    results,
    pagination: {
      page,
      total_pages: totalPages,
      total_count: totalCount,
      page_size: pageSize,
    },
  };
}

describe("PaginatedResponse", () => {
  it("correctly maps pagination fields from raw result", () => {
    const raw = createPaginatedResult(["a", "b"], 1, 5, 50, 10);
    const response = new PaginatedResponse(raw);

    expect(response.results).toEqual(["a", "b"]);
    expect(response.currentPage).toBe(1);
    expect(response.totalPages).toBe(5);
    expect(response.totalCount).toBe(50);
    expect(response.pageSize).toBe(10);
  });

  describe("hasNextPage", () => {
    it("returns true when currentPage < totalPages", () => {
      const raw = createPaginatedResult(["a"], 2, 5, 50);
      const response = new PaginatedResponse(raw);
      expect(response.hasNextPage).toBe(true);
    });

    it("returns false on last page", () => {
      const raw = createPaginatedResult(["a"], 5, 5, 50);
      const response = new PaginatedResponse(raw);
      expect(response.hasNextPage).toBe(false);
    });

    it("returns false when single page", () => {
      const raw = createPaginatedResult(["a"], 1, 1, 1);
      const response = new PaginatedResponse(raw);
      expect(response.hasNextPage).toBe(false);
    });
  });

  describe("hasPreviousPage", () => {
    it("returns true when currentPage > 1", () => {
      const raw = createPaginatedResult(["a"], 3, 5, 50);
      const response = new PaginatedResponse(raw);
      expect(response.hasPreviousPage).toBe(true);
    });

    it("returns false on page 1", () => {
      const raw = createPaginatedResult(["a"], 1, 5, 50);
      const response = new PaginatedResponse(raw);
      expect(response.hasPreviousPage).toBe(false);
    });
  });
});

describe("autoPaginate", () => {
  it("yields all items across multiple pages", async () => {
    const fetcher = vi.fn()
      .mockResolvedValueOnce(createPaginatedResult([1, 2, 3], 1, 3, 9, 3))
      .mockResolvedValueOnce(createPaginatedResult([4, 5, 6], 2, 3, 9, 3))
      .mockResolvedValueOnce(createPaginatedResult([7, 8, 9], 3, 3, 9, 3));

    const items: number[] = [];
    for await (const item of autoPaginate(fetcher)) {
      items.push(item);
    }

    expect(items).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(fetcher).toHaveBeenCalledTimes(3);
  });

  it("stops when total_pages is reached", async () => {
    const fetcher = vi.fn()
      .mockResolvedValueOnce(createPaginatedResult(["a", "b"], 1, 2, 4, 2))
      .mockResolvedValueOnce(createPaginatedResult(["c", "d"], 2, 2, 4, 2));

    const items: string[] = [];
    for await (const item of autoPaginate(fetcher)) {
      items.push(item);
    }

    expect(items).toEqual(["a", "b", "c", "d"]);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("works with single page result", async () => {
    const fetcher = vi.fn().mockResolvedValueOnce(
      createPaginatedResult(["only"], 1, 1, 1, 10),
    );

    const items: string[] = [];
    for await (const item of autoPaginate(fetcher)) {
      items.push(item);
    }

    expect(items).toEqual(["only"]);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("passes page and page_size params to fetcher", async () => {
    const fetcher = vi.fn().mockResolvedValue(
      createPaginatedResult([], 1, 1, 0, 25),
    );

    const items: unknown[] = [];
    for await (const item of autoPaginate(fetcher, { page: 1, page_size: 25 })) {
      items.push(item);
    }

    expect(fetcher).toHaveBeenCalledWith({ page: 1, page_size: 25 });
  });

  it("increments page number for each subsequent request", async () => {
    const fetcher = vi.fn()
      .mockResolvedValueOnce(createPaginatedResult(["a"], 1, 3, 3, 1))
      .mockResolvedValueOnce(createPaginatedResult(["b"], 2, 3, 3, 1))
      .mockResolvedValueOnce(createPaginatedResult(["c"], 3, 3, 3, 1));

    for await (const _ of autoPaginate(fetcher)) {
      // consume
    }

    expect(fetcher).toHaveBeenNthCalledWith(1, { page: 1, page_size: undefined });
    expect(fetcher).toHaveBeenNthCalledWith(2, { page: 2, page_size: undefined });
    expect(fetcher).toHaveBeenNthCalledWith(3, { page: 3, page_size: undefined });
  });

  it("handles empty results", async () => {
    const fetcher = vi.fn().mockResolvedValue(
      createPaginatedResult([], 1, 1, 0, 10),
    );

    const items: unknown[] = [];
    for await (const item of autoPaginate(fetcher)) {
      items.push(item);
    }

    expect(items).toEqual([]);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("starts from the specified page param", async () => {
    const fetcher = vi.fn()
      .mockResolvedValueOnce(createPaginatedResult(["c"], 3, 3, 3, 1));

    const items: string[] = [];
    for await (const item of autoPaginate(fetcher, { page: 3 })) {
      items.push(item);
    }

    expect(items).toEqual(["c"]);
    expect(fetcher).toHaveBeenCalledWith({ page: 3, page_size: undefined });
  });
});
