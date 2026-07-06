import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { injectSEO } from "../src/injection.js";

const dir = join(__dirname, "fixtures/ssr-parity-vectors");
const norm = (h: string) => h.replace(/\s+/g, " ").trim();

// This vector intentionally pins the raw Worker's *bug* (it only reads
// fix.new_url, never fix.replacement_url, so a legacy-shape fix silently
// no-ops). The node SDK deliberately implements the documented delta
// (GENERAL plan Global Constraints (a): new_url || replacement_url), so it
// is expected — by design — to NOT match this vector's expected_html. The
// vector's own notes: "NOT by this shared vector... exists to pin the
// Worker's current (gap) behavior so nobody accidentally 'fixes' an SDK
// back to Worker-for-Worker parity here." The correct SDK behavior for this
// exact payload shape is covered instead by transform.test.ts's
// "replace via legacy-path replacement_url when new_url empty".
const WORKER_GAP_VECTORS = new Set(["brokenlink_legacy_replacement_url_worker_noop"]);

describe("golden parity vectors", () => {
  for (const f of readdirSync(dir).filter((f) => f.endsWith(".json"))) {
    const v = JSON.parse(readFileSync(join(dir, f), "utf8"));
    const test = WORKER_GAP_VECTORS.has(v.name) ? it.skip : it;
    test(v.name, () => {
      const out = injectSEO({ html: v.input_html, suggestions: v.payload });
      expect(norm(out)).toBe(norm(v.expected_html));
    });
  }
});
