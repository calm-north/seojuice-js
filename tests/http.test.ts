import { describe, it, expect, vi, beforeEach } from "vitest";
import { HttpClient } from "../src/http.js";
import {
  AuthenticationError,
  NotFoundError,
  RateLimitError,
  APIError,
  SEOJuiceError,
  TimeoutError,
  NetworkError,
} from "../src/errors.js";

function createMockResponse(options: {
  ok?: boolean;
  status?: number;
  statusText?: string;
  body?: unknown;
  headers?: Record<string, string>;
}): Response {
  const {
    ok = true,
    status = 200,
    statusText = "OK",
    body = {},
    headers = {},
  } = options;

  const headerMap = new Headers(headers);

  return {
    ok,
    status,
    statusText,
    headers: headerMap,
    json: vi.fn().mockResolvedValue(body),
    text: vi.fn().mockResolvedValue(JSON.stringify(body)),
    arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(8)),
  } as unknown as Response;
}

function createClient(mockFetch: ReturnType<typeof vi.fn>, apiKey = "test-key") {
  return new HttpClient({
    baseURL: "https://api.example.com/v2",
    apiKey,
    timeout: 5000,
    fetch: mockFetch as typeof globalThis.fetch,
  });
}

describe("HttpClient", () => {
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch = vi.fn();
  });

  describe("request headers", () => {
    it("sends correct Authorization header with Bearer token", async () => {
      mockFetch.mockResolvedValue(createMockResponse({ body: { ok: true } }));
      const client = createClient(mockFetch, "my-secret-key");

      await client.request("/test/");

      const [, fetchOptions] = mockFetch.mock.calls[0];
      expect(fetchOptions.headers.Authorization).toBe("Bearer my-secret-key");
    });

    it("sends correct Accept header", async () => {
      mockFetch.mockResolvedValue(createMockResponse({ body: {} }));
      const client = createClient(mockFetch);

      await client.request("/test/");

      const [, fetchOptions] = mockFetch.mock.calls[0];
      expect(fetchOptions.headers.Accept).toBe("application/json");
    });

    it("sets Content-Type header when body is present", async () => {
      mockFetch.mockResolvedValue(createMockResponse({ body: { id: 1 } }));
      const client = createClient(mockFetch);

      await client.request("/test/", {
        method: "POST",
        body: { name: "example" },
      });

      const [, fetchOptions] = mockFetch.mock.calls[0];
      expect(fetchOptions.headers["Content-Type"]).toBe("application/json");
    });

    it("does not set Content-Type header when body is absent", async () => {
      mockFetch.mockResolvedValue(createMockResponse({ body: {} }));
      const client = createClient(mockFetch);

      await client.request("/test/");

      const [, fetchOptions] = mockFetch.mock.calls[0];
      expect(fetchOptions.headers["Content-Type"]).toBeUndefined();
    });
  });

  describe("URL building", () => {
    it("builds URL from baseURL and path", async () => {
      mockFetch.mockResolvedValue(createMockResponse({ body: {} }));
      const client = createClient(mockFetch);

      await client.request("/websites/");

      const [url] = mockFetch.mock.calls[0];
      expect(url).toBe("https://api.example.com/v2/websites/");
    });

    it("appends query params to URL", async () => {
      mockFetch.mockResolvedValue(createMockResponse({ body: {} }));
      const client = createClient(mockFetch);

      await client.request("/pages/", {
        query: { page: 2, page_size: 10 },
      });

      const [url] = mockFetch.mock.calls[0];
      const parsed = new URL(url);
      expect(parsed.searchParams.get("page")).toBe("2");
      expect(parsed.searchParams.get("page_size")).toBe("10");
    });

    it("filters out undefined query param values", async () => {
      mockFetch.mockResolvedValue(createMockResponse({ body: {} }));
      const client = createClient(mockFetch);

      await client.request("/pages/", {
        query: { page: 1, search: undefined },
      });

      const [url] = mockFetch.mock.calls[0];
      const parsed = new URL(url);
      expect(parsed.searchParams.get("page")).toBe("1");
      expect(parsed.searchParams.has("search")).toBe(false);
    });

    it("handles boolean query params", async () => {
      mockFetch.mockResolvedValue(createMockResponse({ body: {} }));
      const client = createClient(mockFetch);

      await client.request("/pages/", {
        query: { active: true },
      });

      const [url] = mockFetch.mock.calls[0];
      const parsed = new URL(url);
      expect(parsed.searchParams.get("active")).toBe("true");
    });

    it("strips trailing slashes from baseURL", async () => {
      const client = new HttpClient({
        baseURL: "https://api.example.com/v2///",
        apiKey: "key",
        timeout: 5000,
        fetch: mockFetch as typeof globalThis.fetch,
      });
      mockFetch.mockResolvedValue(createMockResponse({ body: {} }));

      await client.request("/test/");

      const [url] = mockFetch.mock.calls[0];
      expect(url).toBe("https://api.example.com/v2/test/");
    });
  });

  describe("HTTP method", () => {
    it("defaults to GET method", async () => {
      mockFetch.mockResolvedValue(createMockResponse({ body: {} }));
      const client = createClient(mockFetch);

      await client.request("/test/");

      const [, fetchOptions] = mockFetch.mock.calls[0];
      expect(fetchOptions.method).toBe("GET");
    });

    it("uses POST method when specified", async () => {
      mockFetch.mockResolvedValue(createMockResponse({ body: { id: 1 } }));
      const client = createClient(mockFetch);

      await client.request("/test/", {
        method: "POST",
        body: { data: "value" },
      });

      const [, fetchOptions] = mockFetch.mock.calls[0];
      expect(fetchOptions.method).toBe("POST");
    });

    it("serializes body as JSON", async () => {
      mockFetch.mockResolvedValue(createMockResponse({ body: {} }));
      const client = createClient(mockFetch);

      const payload = { name: "test", count: 42 };
      await client.request("/test/", { method: "POST", body: payload });

      const [, fetchOptions] = mockFetch.mock.calls[0];
      expect(fetchOptions.body).toBe(JSON.stringify(payload));
    });

    it("sends undefined body for GET requests", async () => {
      mockFetch.mockResolvedValue(createMockResponse({ body: {} }));
      const client = createClient(mockFetch);

      await client.request("/test/");

      const [, fetchOptions] = mockFetch.mock.calls[0];
      expect(fetchOptions.body).toBeUndefined();
    });
  });

  describe("successful responses", () => {
    it("returns parsed JSON on success", async () => {
      const data = { id: 1, name: "example.com" };
      mockFetch.mockResolvedValue(createMockResponse({ body: data }));
      const client = createClient(mockFetch);

      const result = await client.request("/websites/example.com/");

      expect(result).toEqual(data);
    });

    it("returns ArrayBuffer when responseType is arraybuffer", async () => {
      mockFetch.mockResolvedValue(createMockResponse({ body: {} }));
      const client = createClient(mockFetch);

      const result = await client.request<ArrayBuffer>("/reports/1/download/", {
        responseType: "arraybuffer",
      });

      expect(result).toBeInstanceOf(ArrayBuffer);
    });
  });

  describe("error handling", () => {
    it("throws AuthenticationError on 401", async () => {
      mockFetch.mockResolvedValue(
        createMockResponse({
          ok: false,
          status: 401,
          body: { detail: "Invalid API key" },
        }),
      );
      const client = createClient(mockFetch);

      await expect(client.request("/test/")).rejects.toThrow(AuthenticationError);
    });

    it("throws NotFoundError on 404 with resource path", async () => {
      mockFetch.mockResolvedValue(
        createMockResponse({
          ok: false,
          status: 404,
          body: { detail: "Website not found" },
        }),
      );
      const client = createClient(mockFetch);

      try {
        await client.request("/websites/missing.com/");
        expect.fail("Expected NotFoundError to be thrown");
      } catch (err) {
        expect(err).toBeInstanceOf(NotFoundError);
        const notFoundErr = err as NotFoundError;
        expect(notFoundErr.resource).toBe("/websites/missing.com/");
        expect(notFoundErr.message).toBe("Website not found");
      }
    });

    it("throws RateLimitError on 429 with retry-after header parsed", async () => {
      mockFetch.mockResolvedValue(
        createMockResponse({
          ok: false,
          status: 429,
          body: { detail: "Rate limit exceeded" },
          headers: { "retry-after": "120" },
        }),
      );
      const client = createClient(mockFetch);

      try {
        await client.request("/test/");
        expect.fail("Expected RateLimitError to be thrown");
      } catch (err) {
        expect(err).toBeInstanceOf(RateLimitError);
        const rateErr = err as RateLimitError;
        expect(rateErr.retryAfter).toBe(120);
        expect(rateErr.message).toBe("Rate limit exceeded");
      }
    });

    it("throws RateLimitError with null retryAfter when header is non-numeric", async () => {
      mockFetch.mockResolvedValue(
        createMockResponse({
          ok: false,
          status: 429,
          body: { detail: "Too many requests" },
          headers: { "retry-after": "Wed, 21 Oct 2025 07:28:00 GMT" },
        }),
      );
      const client = createClient(mockFetch);

      try {
        await client.request("/test/");
        expect.fail("Expected RateLimitError to be thrown");
      } catch (err) {
        expect(err).toBeInstanceOf(RateLimitError);
        expect((err as RateLimitError).retryAfter).toBeNull();
      }
    });

    it("throws RateLimitError with null retryAfter when header is missing", async () => {
      mockFetch.mockResolvedValue(
        createMockResponse({
          ok: false,
          status: 429,
          body: { detail: "Too fast" },
        }),
      );
      const client = createClient(mockFetch);

      try {
        await client.request("/test/");
        expect.fail("Expected RateLimitError to be thrown");
      } catch (err) {
        expect(err).toBeInstanceOf(RateLimitError);
        expect((err as RateLimitError).retryAfter).toBeNull();
      }
    });

    it("throws APIError on 500 with body", async () => {
      const errorBody = { detail: "Internal server error", trace: "abc" };
      mockFetch.mockResolvedValue(
        createMockResponse({
          ok: false,
          status: 500,
          body: errorBody,
        }),
      );
      const client = createClient(mockFetch);

      try {
        await client.request("/test/");
        expect.fail("Expected APIError to be thrown");
      } catch (err) {
        expect(err).toBeInstanceOf(APIError);
        const apiErr = err as APIError;
        expect(apiErr.status).toBe(500);
        expect(apiErr.body).toEqual(errorBody);
        expect(apiErr.message).toBe("Internal server error");
      }
    });

    it("extracts error message from detail field in response body", async () => {
      mockFetch.mockResolvedValue(
        createMockResponse({
          ok: false,
          status: 403,
          body: { detail: "Forbidden: insufficient permissions" },
        }),
      );
      const client = createClient(mockFetch);

      try {
        await client.request("/test/");
        expect.fail("Expected APIError to be thrown");
      } catch (err) {
        expect((err as APIError).message).toBe("Forbidden: insufficient permissions");
      }
    });

    it("extracts error from backend 'message' field (SEOJuice API format)", async () => {
      mockFetch.mockResolvedValue(
        createMockResponse({
          ok: false,
          status: 400,
          body: { error: "missing_parameter", message: "URL parameter is required" },
        }),
      );
      const client = createClient(mockFetch);

      try {
        await client.request("/test/");
        expect.fail("Expected APIError to be thrown");
      } catch (err) {
        expect((err as APIError).message).toBe("URL parameter is required");
      }
    });

    it("extracts error from 'error' field when 'message' is absent", async () => {
      mockFetch.mockResolvedValue(
        createMockResponse({
          ok: false,
          status: 400,
          body: { error: "invalid_pagination" },
        }),
      );
      const client = createClient(mockFetch);

      try {
        await client.request("/test/");
        expect.fail("Expected APIError to be thrown");
      } catch (err) {
        expect((err as APIError).message).toBe("invalid_pagination");
      }
    });

    it("falls back to status message when no message/error/detail field", async () => {
      const response = createMockResponse({
        ok: false,
        status: 502,
        body: { unknown_field: "value" },
      });
      mockFetch.mockResolvedValue(response);
      const client = createClient(mockFetch);

      try {
        await client.request("/test/");
        expect.fail("Expected APIError to be thrown");
      } catch (err) {
        expect((err as APIError).message).toBe("Request failed with status 502");
      }
    });

    it("handles non-JSON error response body gracefully", async () => {
      const response = {
        ok: false,
        status: 503,
        statusText: "Service Unavailable",
        headers: new Headers(),
        json: vi.fn().mockRejectedValue(new Error("not json")),
        text: vi.fn().mockResolvedValue("Service Unavailable"),
      } as unknown as Response;
      mockFetch.mockResolvedValue(response);
      const client = createClient(mockFetch);

      try {
        await client.request("/test/");
        expect.fail("Expected APIError to be thrown");
      } catch (err) {
        expect(err).toBeInstanceOf(APIError);
        expect((err as APIError).message).toBe("Request failed with status 503");
      }
    });

    it("includes x-request-id header in error when present", async () => {
      mockFetch.mockResolvedValue(
        createMockResponse({
          ok: false,
          status: 401,
          body: { detail: "Unauthorized" },
          headers: { "x-request-id": "req-12345" },
        }),
      );
      const client = createClient(mockFetch);

      try {
        await client.request("/test/");
        expect.fail("Expected AuthenticationError to be thrown");
      } catch (err) {
        expect((err as AuthenticationError).requestId).toBe("req-12345");
      }
    });
  });

  describe("transport failures", () => {
    it("wraps a raw fetch rejection as NetworkError (instanceof SEOJuiceError, code network_error)", async () => {
      mockFetch.mockRejectedValue(new TypeError("fetch failed"));
      const client = createClient(mockFetch);

      try {
        await client.request("/test/");
        expect.fail("Expected NetworkError to be thrown");
      } catch (err) {
        expect(err).toBeInstanceOf(SEOJuiceError);
        expect(err).toBeInstanceOf(NetworkError);
        expect((err as NetworkError).code).toBe("network_error");
      }
    });

    it("wraps an AbortError (timeout) as TimeoutError with code timeout", async () => {
      const abort = new DOMException("The operation was aborted.", "AbortError");
      mockFetch.mockRejectedValue(abort);
      const client = createClient(mockFetch);

      try {
        await client.request("/test/");
        expect.fail("Expected TimeoutError to be thrown");
      } catch (err) {
        expect(err).toBeInstanceOf(SEOJuiceError);
        expect((err as TimeoutError).code).toBe("timeout");
      }
    });

    it("does not re-wrap a typed HTTP error thrown by handleError", async () => {
      mockFetch.mockResolvedValue(
        createMockResponse({ ok: false, status: 401, body: { detail: "nope" } }),
      );
      const client = createClient(mockFetch);

      await expect(client.request("/test/")).rejects.toThrow(AuthenticationError);
    });
  });
});
