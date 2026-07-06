import { describe, it, expect } from "vitest";
import { injectSEO } from "../src/injection.js";
import type { SuggestionResponse } from "../src/types/injection.js";

// C1 — regression test for the quadratic-backtracking DoS in
// applyBrokenLinkFixes (src/transform.ts). The old whole-document regexes
// (`[^>]*` / `[\s\S]*?`) backtrack catastrophically when a huge run of
// non-`>` characters (e.g. a JSON island inside a <script> tag holding
// serialized HTML) contains many stray `<a`/`<img` substrings — each one
// forces the engine to re-attempt an O(remaining-length) backtrack from
// that position out to the next real `>`, which is O(n) per occurrence and
// O(n^2) total across O(n) occurrences.
//
// Deviation from spec: a single embedded fake "<a href=" occurrence (as
// originally sketched) measures sub-millisecond even on the unfixed code —
// one failed backtrack is O(n), not O(n^2). Reproducing the actual
// quadratic blowup that motivates this fix requires many such occurrences
// packed into the same non-'>' run. Confirmed empirically: 500KB with 5,000
// embedded occurrences takes ~1.17s pre-fix; a single occurrence at 4MB
// takes ~5ms pre-fix. The construction below uses many occurrences so the
// test genuinely fails before the fix and passes after, while preserving
// the original shape (one huge non-'>' text run inside a <script> island)
// and the original assertions/thresholds.
function buildAdversarialHTML(padBytes: number, fakeAnchorCount: number): string {
  const chunkSize = Math.floor(padBytes / fakeAnchorCount);
  const noise = ("<a href=" + "x".repeat(chunkSize)).repeat(fakeAnchorCount);
  return (
    "<html><head></head><body>" +
    `<script type="application/json">${noise}</script>` +
    '<p>See our <a href="/dead-page">guide</a> for more.</p>' +
    "</body></html>"
  );
}

function suggestionsWithBrokenLinkFix(): SuggestionResponse {
  return {
    broken_link_fixes: [{ action: "replace", tag: "a", attr: "href", broken_url: "/dead-page", new_url: "/live-page" }],
  } as unknown as SuggestionResponse;
}

describe("applyBrokenLinkFixes performance (C1 regression)", () => {
  it("completes in well under 100ms for a >=200KB adversarial non-'>' run", () => {
    const html = buildAdversarialHTML(200_000, 2000);
    expect(html.length).toBeGreaterThanOrEqual(200_000);

    const start = performance.now();
    const result = injectSEO({ html, suggestions: suggestionsWithBrokenLinkFix() });
    const elapsedMs = performance.now() - start;

    console.log(`[C1 perf] 200KB adversarial input: ${elapsedMs.toFixed(2)}ms`);
    expect(result).toContain('<a href="/live-page">guide</a>');
    expect(elapsedMs).toBeLessThan(100);
  }, 20_000);

  it("completes quickly for a realistic ~1.9MB shop-page shape (inline JSON island)", () => {
    const html = buildAdversarialHTML(1_900_000, 4000);

    const start = performance.now();
    const result = injectSEO({ html, suggestions: suggestionsWithBrokenLinkFix() });
    const elapsedMs = performance.now() - start;

    console.log(`[C1 perf] 1.9MB adversarial input: ${elapsedMs.toFixed(2)}ms`);
    expect(result).toContain('<a href="/live-page">guide</a>');
    expect(elapsedMs).toBeLessThan(1000);
  }, 120_000);
});
