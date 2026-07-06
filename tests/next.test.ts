import { describe, it, expect, vi } from "vitest";
import { NextResponse } from "next/server";
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

  it("passes through the re-entrant self-fetch without a second origin fetch", async () => {
    const originalFetch = globalThis.fetch;
    const fetchSpy = vi.fn();
    globalThis.fetch = fetchSpy as unknown as typeof globalThis.fetch;
    try {
      const middleware = createSeoMiddleware();
      const request = {
        nextUrl: { toString: () => "https://x.com/funds" },
        headers: new Headers({ "x-seojuice-ssr": "1" }),
      } as any;
      const result = await middleware(request);
      // Re-entrant hop must short-circuit: no origin fetch, no injection.
      expect(fetchSpy).not.toHaveBeenCalled();
      expect(result).toBeInstanceOf(NextResponse);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("stamps the guard header on the origin self-fetch so re-entry is detectable", async () => {
    const htmlResponse = new Response("<html><body><p>hi</p></body></html>", {
      headers: { "content-type": "text/html" },
    });
    const originalFetch = globalThis.fetch;
    const fetchSpy = vi.fn().mockImplementation((input: unknown) => {
      if (typeof input === "string" && input.includes("/suggestions")) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ errors: [], suggestions: [] }) });
      }
      return Promise.resolve(htmlResponse);
    });
    globalThis.fetch = fetchSpy as unknown as typeof globalThis.fetch;
    try {
      const middleware = createSeoMiddleware();
      const request = {
        nextUrl: { toString: () => "https://x.com/funds" },
        headers: new Headers(),
      } as any;
      await middleware(request);
      const originCall = fetchSpy.mock.calls.find(
        ([input]) => !(typeof input === "string" && input.includes("/suggestions")),
      );
      expect(originCall).toBeTruthy();
      const init = originCall?.[1] as { headers?: Headers } | undefined;
      expect(init?.headers?.get("x-seojuice-ssr")).toBe("1");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("returns NextResponse.next() (fails open) when the origin fetch rejects (C2)", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = vi.fn().mockRejectedValue(new Error("ECONNREFUSED"));
    try {
      const middleware = createSeoMiddleware();
      const request = {
        nextUrl: { toString: () => "https://x.com/page" },
        headers: new Headers(),
      } as any;
      const result = await middleware(request);
      expect(result.headers.get("x-middleware-next")).toBe("1");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("returns NextResponse.next() (fails open) when reading the origin body rejects (C2)", async () => {
    const brokenResponse = {
      headers: new Headers({ "content-type": "text/html" }),
      status: 200,
      text: vi.fn().mockRejectedValue(new Error("aborted")),
    };
    const originalFetch = globalThis.fetch;
    globalThis.fetch = vi.fn().mockResolvedValue(brokenResponse);
    try {
      const middleware = createSeoMiddleware();
      const request = {
        nextUrl: { toString: () => "https://x.com/page" },
        headers: new Headers(),
      } as any;
      const result = await middleware(request);
      expect(result.headers.get("x-middleware-next")).toBe("1");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("returns the origin response untouched (never reads the body) when Content-Length exceeds the HTML cap (I3)", async () => {
    const oversized = new Response("<html><body>small body, huge declared length</body></html>", {
      headers: { "content-type": "text/html", "content-length": "50000000" },
    });
    const textSpy = vi.spyOn(oversized, "text");
    const originalFetch = globalThis.fetch;
    globalThis.fetch = vi.fn().mockResolvedValue(oversized);
    try {
      const middleware = createSeoMiddleware();
      const request = {
        nextUrl: { toString: () => "https://x.com/huge" },
        headers: new Headers(),
      } as any;
      const result = await middleware(request);
      expect(result).toBe(oversized);
      expect(textSpy).not.toHaveBeenCalled();
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
