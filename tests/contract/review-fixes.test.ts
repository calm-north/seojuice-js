import { describe, expect, it } from "vitest";
import { SEOJuice } from "../../src/client.js";
import {
  APIError,
  AuthenticationError,
  ForbiddenError,
  NotFoundError,
  PaymentRequiredError,
} from "../../src/errors.js";
import { injectSEO } from "../../src/injection.js";
import { CASES } from "./cases.js";
import { createFixtureServer } from "./fake-server.js";
import { loadFixture } from "./fixtures.js";

const PAGE = "<html><head></head><body><p>Read the SEO Guide today, it is long enough to keep.</p></body></html>";

async function fail(name: string): Promise<{ err: unknown; body: Record<string, unknown> }> {
  const fx = loadFixture(name);
  const server = createFixtureServer(fx);
  const client = new SEOJuice({ apiKey: "k", baseURL: server.baseURL, fetch: server.fetch });
  const err = await CASES[name](client).then(
    () => {
      throw new Error(`${name} should fail`);
    },
    (e: unknown) => e,
  );
  return { err, body: fx.response.body as Record<string, unknown> };
}

describe("injectSEO on an API error payload returns the origin untouched", () => {
  // Shapes from seojuice/pages/views.py: page missing (:311) and excluded page (:414).
  const payloads = [
    { suggestions: [], errors: ["Page doesn't exist"], base: null },
    { suggestions: [], errors: ["Page is excluded"], base: "https://example.com/page" },
  ];
  for (const p of payloads) {
    it(JSON.stringify(p.errors), () => {
      const out = injectSEO({ html: PAGE, suggestions: p });
      expect(out).toBe(PAGE);
      expect(out).not.toContain("seojuiceSSR");
      expect(out).not.toContain("<!-- seojuice:");
    });
  }

  it("an empty payload without errors still gets the SSR flag (Worker behaviour)", () => {
    expect(injectSEO({ html: PAGE, suggestions: { suggestions: [] } })).toContain("seojuiceSSR");
  });
});

describe("internal link anchor keeps the text found on the page", () => {
  it("uses the matched text, not the stored keyword casing (seojuice-ssr.js:553)", () => {
    const out = injectSEO({
      html: PAGE,
      suggestions: { suggestions: [{ keyword: "seo guide", url: "https://example.com/guide", id: 1 }] },
    });
    expect(out).toContain('<a href="https://example.com/guide" data-seojuice-cs="1">SEO Guide</a>');
  });
});

describe("error classes carry the server's error code", () => {
  it("402 trial_required: PaymentRequiredError with checkoutUrl, lockState, errorCode", async () => {
    const { err, body } = await fail("error_402_trial_required");
    expect(err).toBeInstanceOf(PaymentRequiredError);
    expect(err).toBeInstanceOf(APIError);
    const e = err as PaymentRequiredError;
    expect(e.status).toBe(402);
    expect(e.errorCode).toBe(body.error);
    expect(e.checkoutUrl).toBe(body.checkout_url);
    expect(e.lockState).toBe(body.lock_state);
  });

  it("402 website_locked carries its own lock_state", async () => {
    const { err, body } = await fail("error_402_website_locked");
    expect(err).toBeInstanceOf(PaymentRequiredError);
    expect((err as PaymentRequiredError).lockState).toBe(body.lock_state);
    expect((err as PaymentRequiredError).errorCode).toBe(body.error);
  });

  it("403 is a ForbiddenError with the server code", async () => {
    const { err, body } = await fail("error_403_reports_not_in_plan");
    expect(err).toBeInstanceOf(ForbiddenError);
    expect((err as ForbiddenError).status).toBe(403);
    expect((err as ForbiddenError).errorCode).toBe(body.error);
  });

  it("401 and 404 keep their classes and gain errorCode; alt 404 code is preserved", async () => {
    const a = await fail("error_401_invalid_token");
    expect(a.err).toBeInstanceOf(AuthenticationError);
    expect((a.err as AuthenticationError).errorCode).toBe("invalid_token");
    const n = await fail("error_404_website_not_found_alt_code");
    expect(n.err).toBeInstanceOf(NotFoundError);
    expect((n.err as NotFoundError).errorCode).toBe("website_not_found");
  });

  it("other statuses stay APIError; errorCode is the body code and `code` is unchanged", async () => {
    const { err, body } = await fail("bulk_changes_invalid_action");
    expect(err).toBeInstanceOf(APIError);
    expect(err).not.toBeInstanceOf(PaymentRequiredError);
    expect((err as APIError).errorCode).toBe(body.error);
    expect((err as APIError).code).toBe("api_error");
  });
});

describe("existing ld+json array blocks are scanned for @type", () => {
  it("does not duplicate an Article that the page declares in an array block", () => {
    const html =
      '<html><head><script type="application/ld+json">[{"@type":"Article"},{"@type":"Organization"}]</script></head><body><p>Body text long enough to keep.</p></body></html>';
    const out = injectSEO({
      html,
      suggestions: { structured_data: JSON.stringify([{ "@type": "Article" }, { "@type": "FAQPage" }]) },
    });
    expect(out).toContain('data-seojuice="schema">[{"@type":"FAQPage"}]</script>');
    expect(out).not.toContain('{"@type":"Article"}]</script>\n');
  });
});
