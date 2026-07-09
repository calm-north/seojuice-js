import { createHmac } from "node:crypto";

import { describe, it, expect } from "vitest";

import { verifyWebhookSignature } from "../src/webhooks.js";

const SECRET = "whsec_test_secret";
const BODY = '{"event":"change.created","change":{"id":1}}';

function sign(secret: string, body: string | Buffer): string {
  return createHmac("sha256", secret).update(body).digest("hex");
}

describe("verifyWebhookSignature", () => {
  it("returns true for a valid signature", () => {
    const signature = sign(SECRET, BODY);
    expect(verifyWebhookSignature(SECRET, BODY, signature)).toBe(true);
  });

  it("returns false when the body is tampered with", () => {
    const signature = sign(SECRET, BODY);
    const tampered = BODY.replace("change.created", "change.rejected");
    expect(verifyWebhookSignature(SECRET, tampered, signature)).toBe(false);
  });

  it("returns false when the secret is wrong", () => {
    const signature = sign(SECRET, BODY);
    expect(verifyWebhookSignature("wrong_secret", BODY, signature)).toBe(false);
  });

  it("returns false (never throws) for a malformed signature", () => {
    expect(verifyWebhookSignature(SECRET, BODY, "not-hex-at-all")).toBe(false);
  });

  it("returns false (never throws) for a too-short signature", () => {
    const signature = sign(SECRET, BODY);
    expect(verifyWebhookSignature(SECRET, BODY, signature.slice(0, 8))).toBe(false);
  });

  it("returns false (never throws) for an empty signature", () => {
    expect(verifyWebhookSignature(SECRET, BODY, "")).toBe(false);
  });

  it("verifies a string body", () => {
    const signature = sign(SECRET, BODY);
    expect(verifyWebhookSignature(SECRET, BODY, signature)).toBe(true);
  });

  it("verifies a Buffer body", () => {
    const buf = Buffer.from(BODY, "utf8");
    const signature = sign(SECRET, buf);
    expect(verifyWebhookSignature(SECRET, buf, signature)).toBe(true);
  });

  it("treats a Buffer body and its string equivalent identically", () => {
    const buf = Buffer.from(BODY, "utf8");
    const signature = sign(SECRET, BODY);
    expect(verifyWebhookSignature(SECRET, buf, signature)).toBe(true);
  });

  it("returns false (never throws) when the body is null", () => {
    const signature = sign(SECRET, BODY);
    expect(
      verifyWebhookSignature(SECRET, null as unknown as string, signature),
    ).toBe(false);
  });

  it("returns false (never throws) when the secret is null", () => {
    const signature = sign(SECRET, BODY);
    expect(
      verifyWebhookSignature(null as unknown as string, BODY, signature),
    ).toBe(false);
  });

  it("returns false (never throws) when the body is a non-string, non-Buffer value", () => {
    const signature = sign(SECRET, BODY);
    expect(
      verifyWebhookSignature(SECRET, { foo: "bar" } as unknown as string, signature),
    ).toBe(false);
  });
});
