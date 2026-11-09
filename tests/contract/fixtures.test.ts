import { describe, expect, it } from "vitest";
import { SEOJuice } from "../../src/client.js";
import {
  APIError,
  AuthenticationError,
  NotFoundError,
  RateLimitError,
} from "../../src/errors.js";
import { CASES, NO_SDK_METHOD } from "./cases.js";
import { createFixtureServer } from "./fake-server.js";
import { fixtureNames, loadFixture } from "./fixtures.js";

describe("fixture coverage", () => {
  const names = fixtureNames();

  it("every recorded fixture is either routed to an SDK call or listed as having no SDK method", () => {
    const unplaced = names.filter((n) => !(n in CASES) && !NO_SDK_METHOD.has(n));
    expect(unplaced).toEqual([]);
  });

  it("no case or exclusion names a fixture that does not exist", () => {
    const known = new Set(names);
    const stale = [...Object.keys(CASES), ...NO_SDK_METHOD].filter((n) => !known.has(n));
    expect(stale).toEqual([]);
  });

  it("no fixture is both routed and excluded", () => {
    expect(Object.keys(CASES).filter((n) => NO_SDK_METHOD.has(n))).toEqual([]);
  });
});

describe("SDK against recorded server responses", () => {
  for (const [name, call] of Object.entries(CASES)) {
    it(name, async () => {
      const fx = loadFixture(name);
      const server = createFixtureServer(fx);
      const client = new SEOJuice({ apiKey: "k", baseURL: server.baseURL, fetch: server.fetch });
      const { status, body, body_base64 } = fx.response;

      if (status < 400) {
        const result = await call(client);
        if (body_base64 !== undefined) {
          expect(Buffer.from(result as ArrayBuffer).toString("base64")).toBe(body_base64);
        } else {
          expect(result).toEqual(body);
        }
      } else {
        const err = await call(client).then(
          () => {
            throw new Error(`expected ${name} to fail with ${status}`);
          },
          (e: unknown) => e,
        );
        const b = body as { error?: string; message?: string };
        expect((err as APIError).status).toBe(status);
        expect((err as Error).message).toBe(b.message ?? b.error);
        if (status === 401) expect(err).toBeInstanceOf(AuthenticationError);
        else if (status === 404) expect(err).toBeInstanceOf(NotFoundError);
        else if (status === 429) expect(err).toBeInstanceOf(RateLimitError);
        else {
          expect(err).toBeInstanceOf(APIError);
          expect((err as APIError).body).toEqual(body);
        }
      }
      expect(server.unexpected).toEqual([]);
      expect(server.requests).toHaveLength(1);
    });
  }

  it("an unrouted request fails: a call that matches no fixture is rejected", async () => {
    const server = createFixtureServer(loadFixture("get_website"));
    const client = new SEOJuice({ apiKey: "k", baseURL: server.baseURL, fetch: server.fetch });
    await expect(client.pages.list("fixtures.example")).rejects.toThrow();
    expect(server.unexpected).toHaveLength(1);
  });
});
