import { describe, expect, it } from "vitest";
import { SEOJuice } from "../../src/client.js";
import {
  ChangeStatus,
  ChangeStatusFilter,
  ChangeType,
} from "../../src/types/changes.js";
import { createFixtureServer, createRecordingServer } from "./fake-server.js";
import { FIXTURE_DOMAIN as D, loadFixture } from "./fixtures.js";

const BATCH = "3f2b8c1e-7d4a-4f6b-9a1c-2e5d8b7a6c90";

function clientFor(name: string) {
  const server = createFixtureServer(loadFixture(name));
  const client = new SEOJuice({ apiKey: "k", baseURL: server.baseURL, fetch: server.fetch });
  return { client, server };
}

describe("changes.reject", () => {
  it("sends the reason; the server answers with the rejected change", async () => {
    const { client, server } = clientFor("reject_change");
    const rec = await client.changes.reject(D, 1, { reason: "Does not match our tone" });
    expect(server.unexpected).toEqual([]);
    expect(rec.status).toBe("rejected");
  });

  it("requires a reason: without one the server answers 422 missing_field", async () => {
    const { client, server } = clientFor("reject_change_without_reason");
    // @ts-expect-error reason is required by the server, so the type requires it
    const call = client.changes.reject(D, 1);
    await expect(call).rejects.toMatchObject({
      status: 422,
      message: "reason is required when rejecting a change",
    });
    expect(server.unexpected).toEqual([]);
  });
});

describe("changes.approve", () => {
  it("an h1 change is refused with 400 until confirm_heading is true", async () => {
    const { client } = clientFor("approve_heading_without_confirmation");
    await expect(client.changes.approve(D, 1)).rejects.toMatchObject({
      status: 400,
      message: "Approving a page heading needs confirm_heading=true.",
    });
  });

  it("sends confirm_heading: true given snake_case", async () => {
    const { client, server } = clientFor("approve_heading_confirmed");
    const rec = await client.changes.approve(D, 1, { confirm_heading: true });
    expect(server.unexpected).toEqual([]);
    expect(rec.status).toBe("live");
  });

  it("accepts confirmHeading and sends the server's snake_case key", async () => {
    const { client, server } = clientFor("approve_heading_confirmed");
    await client.changes.approve(D, 1, { confirmHeading: true });
    expect(server.requests[0].body).toEqual({ confirm_heading: true });
    expect(server.unexpected).toEqual([]);
  });
});

describe("changes.bulk", () => {
  it("approves ids; a missing id comes back in failed[]", async () => {
    const { client, server } = clientFor("bulk_approve_changes");
    const res = await client.changes.bulk(D, { action: "approve", ids: [1, 2, 3] });
    expect(server.unexpected).toEqual([]);
    expect(res.total_succeeded + res.total_failed).toBe(3);
  });
});

describe("batch_id (no fixture records it; server rules: partners/views.py ChangeListView, ChangeBulkView)", () => {
  const list = loadFixture("list_changes").response.body;
  const bulk = loadFixture("bulk_approve_changes").response.body;

  it("changes.list passes batch_id as a query parameter", async () => {
    const server = createRecordingServer(list);
    const client = new SEOJuice({ apiKey: "k", baseURL: server.baseURL, fetch: server.fetch });
    await client.changes.list(D, { batch_id: BATCH });
    expect(server.requests).toHaveLength(1);
    expect(server.requests[0].query).toEqual({ batch_id: BATCH });
  });

  it("changes.bulk accepts batch_id without ids", async () => {
    const server = createRecordingServer(bulk);
    const client = new SEOJuice({ apiKey: "k", baseURL: server.baseURL, fetch: server.fetch });
    await client.changes.bulk(D, { action: "approve", batch_id: BATCH });
    expect(server.requests[0].body).toEqual({ action: "approve", batch_id: BATCH });
  });
});

describe("status and type vocabulary", () => {
  it("ChangeStatus holds the server lifecycle states (delivery/models.py LifecycleState)", () => {
    const lifecycle = ["proposed", "approved", "live", "rolled_back", "rejected", "superseded", "stale", "expired"];
    const values = Object.values(ChangeStatus) as string[];
    for (const state of lifecycle) expect(values).toContain(state);
  });

  it("ChangeStatusFilter holds the legacy filter terms the server maps (ChangeListView)", () => {
    expect((Object.values(ChangeStatusFilter) as string[]).sort()).toEqual(
      ["applied", "approved", "expired", "pending", "pulled", "rejected", "reverted", "verified"],
    );
  });

  it("ChangeType includes h1_tag, broken_link_fix and content_patch (actionitems/constants.py)", () => {
    const values = Object.values(ChangeType) as string[];
    for (const t of ["h1_tag", "broken_link_fix", "content_patch"]) expect(values).toContain(t);
  });

  it("every status in the recorded change fixtures is a lifecycle state", () => {
    const lifecycle = new Set(["proposed", "approved", "live", "rolled_back", "rejected", "superseded", "stale", "expired"]);
    for (const name of ["get_change", "get_change_live", "approve_change", "reject_change", "revert_change", "pull_change", "verify_change"]) {
      const body = loadFixture(name).response.body as { status: string };
      expect(lifecycle.has(body.status), `${name}: ${body.status}`).toBe(true);
    }
    const list = loadFixture("list_changes").response.body as { results: { status: string }[] };
    for (const r of list.results) expect(lifecycle.has(r.status)).toBe(true);
  });

  it("the filter vocabulary is not the record vocabulary: 'live' is not a filter term", async () => {
    const server = createRecordingServer(loadFixture("list_changes").response.body);
    const client = new SEOJuice({ apiKey: "k", baseURL: server.baseURL, fetch: server.fetch });
    // @ts-expect-error "live" is a record status, not a filter term
    await client.changes.list(D, { status: "live" });
  });
});

describe("reports.create", () => {
  it("rejects a type outside this_month|last_month|this_week|last_week with 400 invalid_type", async () => {
    const { client } = clientFor("create_report_invalid_type");
    // @ts-expect-error "yearly" is not a report type
    const call = client.reports.create(D, { type: "yearly" });
    await expect(call).rejects.toMatchObject({ status: 400 });
  });
});

describe("content.listChanges (deprecated)", () => {
  it("requests the same path and query as changes.list", async () => {
    const server = createRecordingServer(loadFixture("list_changes").response.body);
    const client = new SEOJuice({ apiKey: "k", baseURL: server.baseURL, fetch: server.fetch });
    await client.content.listChanges(D, { status: "pending" });
    await client.changes.list(D, { status: ChangeStatusFilter.Pending });
    const [a, b] = server.requests;
    expect([a.path, a.query]).toEqual([b.path, b.query]);
  });
});
