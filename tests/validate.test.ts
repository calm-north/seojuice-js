import { describe, it, expect } from "vitest";
import { validateDomain, validateId } from "../src/validate.js";

describe("validateDomain", () => {
  it("accepts valid domain names", () => {
    expect(() => validateDomain("example.com")).not.toThrow();
    expect(() => validateDomain("my-site.co.uk")).not.toThrow();
    expect(() => validateDomain("sub.domain.example.com")).not.toThrow();
    expect(() => validateDomain("localhost")).not.toThrow();
  });

  it("rejects empty string", () => {
    expect(() => validateDomain("")).toThrow(TypeError);
  });

  it("rejects domain with forward slashes (path traversal)", () => {
    expect(() => validateDomain("example.com/../../admin")).toThrow(TypeError);
    expect(() => validateDomain("../etc/passwd")).toThrow(TypeError);
  });

  it("rejects domain with backslashes", () => {
    expect(() => validateDomain("example.com\\admin")).toThrow(TypeError);
  });

  it("rejects domain with query string", () => {
    expect(() => validateDomain("example.com?token=evil")).toThrow(TypeError);
  });

  it("rejects domain with fragment", () => {
    expect(() => validateDomain("example.com#fragment")).toThrow(TypeError);
  });

  it("rejects domain with @ (userinfo injection)", () => {
    expect(() => validateDomain("attacker.com@example.com")).toThrow(TypeError);
  });

  it("rejects domain with spaces", () => {
    expect(() => validateDomain("example .com")).toThrow(TypeError);
  });
});

describe("validateId", () => {
  it("accepts valid numeric IDs", () => {
    expect(() => validateId(1, "pageId")).not.toThrow();
    expect(() => validateId(42, "reportId")).not.toThrow();
    expect(() => validateId(0, "id")).not.toThrow();
  });

  it("accepts valid string IDs", () => {
    expect(() => validateId("abc-123", "analysisId")).not.toThrow();
    expect(() => validateId("some-uuid-value", "id")).not.toThrow();
  });

  it("rejects NaN", () => {
    expect(() => validateId(NaN, "id")).toThrow(TypeError);
  });

  it("rejects Infinity", () => {
    expect(() => validateId(Infinity, "id")).toThrow(TypeError);
  });

  it("rejects empty string", () => {
    expect(() => validateId("", "id")).toThrow(TypeError);
  });

  it("rejects string with slashes", () => {
    expect(() => validateId("../../admin", "id")).toThrow(TypeError);
  });

  it("rejects string with query chars", () => {
    expect(() => validateId("id?extra=1", "id")).toThrow(TypeError);
  });
});
