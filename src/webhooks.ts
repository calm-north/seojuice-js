import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Verify an HMAC-SHA256 webhook signature against the raw request body.
 * `secret` is used as-is (UTF-8) as the HMAC key. `signature` is the raw hex
 * digest from the `X-SEOJuice-Signature` header. Constant-time; returns false
 * (never throws) on a malformed or length-mismatched signature.
 */
export function verifyWebhookSignature(
  secret: string,
  body: string | Buffer,
  signature: string,
): boolean {
  if (typeof secret !== "string") return false;
  if (typeof body !== "string" && !Buffer.isBuffer(body)) return false;

  const expected = createHmac("sha256", secret).update(body).digest("hex");
  const a = Buffer.from(signature ?? "", "utf8");
  const b = Buffer.from(expected, "utf8");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
