import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = join(__dirname, "../fixtures");
const SYNCED_DIRS = ["api-fixtures", "ssr-parity-vectors"];

function manifest(): Map<string, string> {
  const map = new Map<string, string>();
  for (const line of readFileSync(join(ROOT, "MANIFEST.sha256"), "utf8").split("\n")) {
    if (!line.trim()) continue;
    const m = line.match(/^([0-9a-f]{64})\s+(\S.*)$/);
    if (!m) throw new Error(`bad MANIFEST line: ${line}`);
    map.set(m[2], m[1]);
  }
  return map;
}

describe("fixture manifest (MANIFEST.sha256)", () => {
  const entries = manifest();

  it("lists at least one file", () => {
    expect(entries.size).toBeGreaterThan(0);
  });

  it("every listed file exists and matches its sha256", () => {
    const mismatched: string[] = [];
    for (const [file, sha] of entries) {
      const actual = createHash("sha256").update(readFileSync(join(ROOT, file))).digest("hex");
      if (actual !== sha) mismatched.push(file);
    }
    expect(mismatched).toEqual([]);
  });

  it("every file in the synced directories is listed", () => {
    const unlisted: string[] = [];
    for (const dir of SYNCED_DIRS) {
      for (const f of readdirSync(join(ROOT, dir))) {
        if (!entries.has(`${dir}/${f}`)) unlisted.push(`${dir}/${f}`);
      }
    }
    expect(unlisted).toEqual([]);
  });
});
