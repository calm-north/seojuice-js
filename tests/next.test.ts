import { describe, it, expect, vi } from "vitest";
import { sendViewBeacon, createSeoMiddleware } from "../src/next.js";

describe("sendViewBeacon", () => {
  it("is fire-and-forget and swallows errors", async () => {
    const f = vi.fn().mockRejectedValue(new Error("x"));
    await expect(
      sendViewBeacon("https://smart.seojuice.io", "https://x.com/p", "GPTBot", "", f),
    ).resolves.toBeUndefined();
    const [u] = f.mock.calls[0];
    expect(String(u)).toContain("/views?");
    expect(String(u)).toContain("user_agent=GPTBot");
  });

  it("carries no cookies/body — only url/user_agent/referrer/source params", async () => {
    const f = vi.fn().mockResolvedValue({ ok: true });
    await sendViewBeacon("https://smart.seojuice.io", "https://x.com/p", "GPTBot", "https://ref.com", f);
    const [u, init] = f.mock.calls[0];
    const parsed = new URL(String(u));
    expect(parsed.searchParams.get("url")).toBe("https://x.com/p");
    expect(parsed.searchParams.get("referrer")).toBe("https://ref.com");
    expect(parsed.searchParams.get("source")).toBe("node_sdk");
    expect(init).toBeUndefined();
  });
});

describe("createSeoMiddleware", () => {
  it("returns non-HTML responses untouched", async () => {
    const middleware = createSeoMiddleware();
    const jsonResponse = new Response("{}", { headers: { "content-type": "application/json" } });
    const originalFetch = globalThis.fetch;
    globalThis.fetch = vi.fn().mockResolvedValue(jsonResponse);
    try {
      const request = {
        nextUrl: { toString: () => "https://x.com/api/data" },
        headers: new Headers(),
      } as any;
      const result = await middleware(request);
      expect(result).toBe(jsonResponse);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("injects into HTML responses via the origin-fetch pattern", async () => {
    const htmlResponse = new Response("<html><body><p>SWP</p></body></html>", {
      headers: { "content-type": "text/html" },
    });
    const originalFetch = globalThis.fetch;
    const suggestFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ errors: [], suggestions: [{ keyword: "SWP", url: "/swp", id: 1 }] }),
    });
    globalThis.fetch = vi.fn().mockImplementation((input: unknown) => {
      if (typeof input === "string" && input.includes("/suggestions")) {
        return suggestFetch(input);
      }
      return Promise.resolve(htmlResponse);
    }) as unknown as typeof globalThis.fetch;

    try {
      const middleware = createSeoMiddleware();
      const request = {
        nextUrl: { toString: () => "https://x.com/page" },
        headers: new Headers(),
      } as any;
      const result = await middleware(request);
      const body = await result.text();
      expect(body).toContain('<a href="/swp"');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
