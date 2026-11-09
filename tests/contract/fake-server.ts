import { API_BASE, fixturePath, type ApiFixture } from "./fixtures.js";

export interface RecordedRequest {
  method: string;
  path: string;
  query: Record<string, string>;
  body: unknown;
}

function jsonResponse(fx: ApiFixture): Response {
  const { status, content_type, body, body_base64 } = fx.response;
  const payload = body_base64 !== undefined ? Buffer.from(body_base64, "base64") : JSON.stringify(body);
  return new Response(payload, { status, headers: { "content-type": content_type } });
}

/**
 * Serves exactly the request recorded in one real server fixture, answering with
 * the fixture's recorded response. Any other request (other method, path, query
 * or body) is recorded in `unexpected` and rejected, so a test fails when the SDK
 * sends something the server never saw.
 */
export function createFixtureServer(fx: ApiFixture) {
  const requests: RecordedRequest[] = [];
  const unexpected: string[] = [];
  const wantPath = fixturePath(fx);
  const wantQuery = Object.fromEntries(
    Object.entries(fx.request.query ?? {}).map(([k, v]) => [k, String(v)]),
  );

  const fetch: typeof globalThis.fetch = async (input, init) => {
    const url = new URL(String(input));
    const method = (init?.method ?? "GET").toUpperCase();
    const req: RecordedRequest = {
      method,
      path: url.pathname,
      query: Object.fromEntries(url.searchParams.entries()),
      body: init?.body ? JSON.parse(String(init.body)) : undefined,
    };
    requests.push(req);
    const wantBody = fx.request.body ?? undefined;
    const matches =
      method === fx.request.method &&
      url.pathname === wantPath &&
      JSON.stringify(sortKeys(req.query)) === JSON.stringify(sortKeys(wantQuery)) &&
      JSON.stringify(sortDeep(emptyToUndefined(req.body))) ===
        JSON.stringify(sortDeep(emptyToUndefined(wantBody)));
    if (!matches) {
      unexpected.push(`${method} ${url.pathname}${url.search} body=${JSON.stringify(req.body)}`);
      throw new Error(`unexpected request: ${method} ${url.pathname}${url.search}`);
    }
    return jsonResponse(fx);
  };

  return { fetch, requests, unexpected, baseURL: API_BASE };
}

/** Free-form server for requests that no fixture covers (e.g. batch_id). Answers 200 with `body`. */
export function createRecordingServer(body: unknown) {
  const requests: RecordedRequest[] = [];
  const fetch: typeof globalThis.fetch = async (input, init) => {
    const url = new URL(String(input));
    requests.push({
      method: (init?.method ?? "GET").toUpperCase(),
      path: url.pathname,
      query: Object.fromEntries(url.searchParams.entries()),
      body: init?.body ? JSON.parse(String(init.body)) : undefined,
    });
    return new Response(JSON.stringify(body), { status: 200, headers: { "content-type": "application/json" } });
  };
  return { fetch, requests, baseURL: API_BASE };
}

// The recorded requests send `{}` where the SDK sends no body; the server treats both as empty.
function emptyToUndefined(v: unknown): unknown {
  if (v === null || v === undefined) return undefined;
  if (typeof v === "object" && !Array.isArray(v) && Object.keys(v).length === 0) return undefined;
  return v;
}

function sortKeys(o: Record<string, string>): Record<string, string> {
  return Object.fromEntries(Object.entries(o).sort(([a], [b]) => a.localeCompare(b)));
}

function sortDeep(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(sortDeep);
  if (v && typeof v === "object") {
    return Object.fromEntries(
      Object.entries(v as Record<string, unknown>)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, val]) => [k, sortDeep(val)]),
    );
  }
  return v;
}
