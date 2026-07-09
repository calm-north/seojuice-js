import { describe, it, expect } from "vitest";
import {
  SEOJuiceError,
  AuthenticationError,
  NotFoundError,
  RateLimitError,
  APIError,
  TimeoutError,
  NetworkError,
} from "../src/errors.js";

describe("SEOJuiceError", () => {
  it("sets name, code, status, and message", () => {
    const error = new SEOJuiceError("something broke", "api_error", 500);
    expect(error.message).toBe("something broke");
    expect(error.name).toBe("SEOJuiceError");
    expect(error.code).toBe("api_error");
    expect(error.status).toBe(500);
  });

  it("extends Error", () => {
    const error = new SEOJuiceError("test", "api_error", 500);
    expect(error).toBeInstanceOf(Error);
  });

  it("defaults requestId to null", () => {
    const error = new SEOJuiceError("test", "api_error", 500);
    expect(error.requestId).toBeNull();
  });

  it("stores requestId when provided", () => {
    const error = new SEOJuiceError("test", "api_error", 500, "req-123");
    expect(error.requestId).toBe("req-123");
  });
});

describe("AuthenticationError", () => {
  it("sets status to 401 and code to authentication_error", () => {
    const error = new AuthenticationError("Invalid API key");
    expect(error.status).toBe(401);
    expect(error.code).toBe("authentication_error");
  });

  it("sets name to AuthenticationError", () => {
    const error = new AuthenticationError("bad key");
    expect(error.name).toBe("AuthenticationError");
  });

  it("extends SEOJuiceError", () => {
    const error = new AuthenticationError("bad key");
    expect(error).toBeInstanceOf(SEOJuiceError);
    expect(error).toBeInstanceOf(Error);
  });

  it("stores requestId when provided", () => {
    const error = new AuthenticationError("bad key", "req-abc");
    expect(error.requestId).toBe("req-abc");
  });
});

describe("NotFoundError", () => {
  it("sets status to 404 and code to not_found", () => {
    const error = new NotFoundError("Not found", "/websites/example.com/");
    expect(error.status).toBe(404);
    expect(error.code).toBe("not_found");
  });

  it("sets name to NotFoundError", () => {
    const error = new NotFoundError("Not found", "/websites/example.com/");
    expect(error.name).toBe("NotFoundError");
  });

  it("stores the resource path", () => {
    const error = new NotFoundError("Not found", "/websites/example.com/");
    expect(error.resource).toBe("/websites/example.com/");
  });

  it("extends SEOJuiceError", () => {
    const error = new NotFoundError("nope", "/path");
    expect(error).toBeInstanceOf(SEOJuiceError);
    expect(error).toBeInstanceOf(Error);
  });

  it("stores requestId when provided", () => {
    const error = new NotFoundError("nope", "/path", "req-xyz");
    expect(error.requestId).toBe("req-xyz");
  });
});

describe("RateLimitError", () => {
  it("sets status to 429 and code to rate_limit_exceeded", () => {
    const error = new RateLimitError("Too many requests");
    expect(error.status).toBe(429);
    expect(error.code).toBe("rate_limit_exceeded");
  });

  it("sets name to RateLimitError", () => {
    const error = new RateLimitError("slow down");
    expect(error.name).toBe("RateLimitError");
  });

  it("stores retryAfter when provided", () => {
    const error = new RateLimitError("slow down", 60);
    expect(error.retryAfter).toBe(60);
  });

  it("defaults retryAfter to null", () => {
    const error = new RateLimitError("slow down");
    expect(error.retryAfter).toBeNull();
  });

  it("extends SEOJuiceError", () => {
    const error = new RateLimitError("slow down");
    expect(error).toBeInstanceOf(SEOJuiceError);
    expect(error).toBeInstanceOf(Error);
  });

  it("stores requestId when provided", () => {
    const error = new RateLimitError("slow", 30, "req-rate");
    expect(error.requestId).toBe("req-rate");
  });
});

describe("APIError", () => {
  it("sets the provided status and code to api_error", () => {
    const error = new APIError("Server error", 500);
    expect(error.status).toBe(500);
    expect(error.code).toBe("api_error");
  });

  it("sets name to APIError", () => {
    const error = new APIError("Server error", 500);
    expect(error.name).toBe("APIError");
  });

  it("stores the response body", () => {
    const body = { errors: ["something went wrong"] };
    const error = new APIError("Server error", 500, body);
    expect(error.body).toEqual(body);
  });

  it("defaults body to null", () => {
    const error = new APIError("Server error", 500);
    expect(error.body).toBeNull();
  });

  it("extends SEOJuiceError", () => {
    const error = new APIError("fail", 503);
    expect(error).toBeInstanceOf(SEOJuiceError);
    expect(error).toBeInstanceOf(Error);
  });

  it("stores requestId when provided", () => {
    const error = new APIError("fail", 500, null, "req-api");
    expect(error.requestId).toBe("req-api");
  });
});

describe("TimeoutError", () => {
  it("sets code to timeout, status to 0, and is a SEOJuiceError", () => {
    const error = new TimeoutError("Request timed out after 30000ms");
    expect(error.code).toBe("timeout");
    expect(error.status).toBe(0);
    expect(error.name).toBe("TimeoutError");
    expect(error).toBeInstanceOf(SEOJuiceError);
    expect(error).toBeInstanceOf(Error);
  });

  it("stores requestId when provided", () => {
    const error = new TimeoutError("timed out", "req-timeout");
    expect(error.requestId).toBe("req-timeout");
  });
});

describe("NetworkError", () => {
  it("sets code to network_error, status to 0, and is a SEOJuiceError", () => {
    const error = new NetworkError("fetch failed");
    expect(error.code).toBe("network_error");
    expect(error.status).toBe(0);
    expect(error.name).toBe("NetworkError");
    expect(error).toBeInstanceOf(SEOJuiceError);
    expect(error).toBeInstanceOf(Error);
  });

  it("preserves the underlying cause", () => {
    const original = new TypeError("fetch failed");
    const error = new NetworkError("fetch failed", original);
    expect(error.cause).toBe(original);
  });
});
