import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

export const FIXTURE_DIR = join(__dirname, "../fixtures/api-fixtures");
export const FIXTURE_DOMAIN = "fixtures.example";
export const API_BASE = "https://seojuice.test/api/v2";

export interface ApiFixture {
  name: string;
  operation: string;
  request: {
    method: string;
    path: string;
    path_params: Record<string, string | number>;
    domain: string;
    query: Record<string, string | number | boolean> | null;
    body: unknown;
    authorization: string | null;
  };
  response: {
    status: number;
    content_type: string;
    body: unknown;
    body_base64?: string;
  };
}

export function fixtureNames(): string[] {
  return readdirSync(FIXTURE_DIR)
    .filter((f) => f.endsWith(".json") && f !== "_index.json")
    .map((f) => f.slice(0, -".json".length))
    .sort();
}

export function loadFixture(name: string): ApiFixture {
  const raw = JSON.parse(readFileSync(join(FIXTURE_DIR, `${name}.json`), "utf8"));
  return { name, ...raw };
}

/** Concrete URL path of a fixture's request, e.g. /api/v2/websites/fixtures.example/changes/1/approve/ */
export function fixturePath(fx: ApiFixture): string {
  let path = fx.request.path.replace("{domain}", fx.request.domain);
  for (const [k, v] of Object.entries(fx.request.path_params)) {
    path = path.replace(`{${k}}`, String(v));
  }
  return `/api/v2${path}`;
}
