import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { enteredGuests, guestListResult, type GuestListDeps, type GuestTrace } from "./guest-list.ts";
import { instagramProfileUrl, NOT_INVITED } from "./instagram.ts";

const at = (iso: string) => new Date(iso);

const ALLOWED = ["ana", "beto", "caro", "dani", "nunca.entro"];
const TRACES: GuestTrace[] = [
  { handle: "ana", at: at("2026-10-10T23:10:00-03:00") },
  { handle: "beto", at: at("2026-10-10T23:40:00-03:00") },
  // Ana's later like doesn't move her: she got in at her first trace.
  { handle: "ana", at: at("2026-10-11T01:00:00-03:00") },
  { handle: "caro", at: at("2026-10-11T00:30:00-03:00") },
];

/** Fake data layer that records whether the guest data was read at all. */
function deps(overrides: Partial<GuestListDeps> = {}) {
  const calls = { traces: 0, allowed: 0 };
  const d: GuestListDeps = {
    isInvited: async (h) => ALLOWED.includes(h),
    traces: async () => (calls.traces++, TRACES),
    allowedHandles: async () => (calls.allowed++, ALLOWED),
    ...overrides,
  };
  return { deps: d, calls };
}

describe("guestListResult: session", () => {
  for (const [label, raw] of [
    ["no handle", null],
    ["empty handle", ""],
    ["invalid handle", "no válido!"],
  ] as const) {
    it(`401 with ${label}, without reading the guest data`, async () => {
      const { deps: d, calls } = deps();
      const res = await guestListResult(raw, d, NOT_INVITED);
      assert.equal(res.status, 401);
      assert.ok(!("handles" in res.body));
      assert.deepEqual(calls, { traces: 0, allowed: 0 });
    });
  }

  it("403 NOT_INVITED for a handle off the guest list, without reading the guest data", async () => {
    const { deps: d, calls } = deps();
    const res = await guestListResult("colado", d, NOT_INVITED);
    assert.equal(res.status, 403);
    assert.equal((res.body as { code?: string }).code, NOT_INVITED);
    assert.deepEqual(calls, { traces: 0, allowed: 0 });
  });

  it("200 for an invited guest, normalizing the handle like the other routes", async () => {
    const res = await guestListResult("@Ana ", deps().deps, NOT_INVITED);
    assert.equal(res.status, 200);
    assert.deepEqual(res.body, { handles: ["caro", "beto", "ana"] });
  });
});

describe("guestListResult: what it exposes", () => {
  it("only handles, nothing else per guest", async () => {
    const res = await guestListResult("ana", deps().deps, NOT_INVITED);
    assert.deepEqual(Object.keys(res.body), ["handles"]);
    for (const h of (res.body as { handles: unknown[] }).handles) assert.equal(typeof h, "string");
  });

  it("never lists an invited guest who hasn't come in", async () => {
    const res = await guestListResult("nunca.entro", deps().deps, NOT_INVITED);
    assert.equal(res.status, 200);
    const { handles } = res.body as { handles: string[] };
    assert.ok(!handles.includes("nunca.entro"));
    assert.ok(!handles.includes("dani"));
  });
});

describe("enteredGuests", () => {
  const allowed = new Set(ALLOWED);

  it("newest first by first trace, one row per guest", () => {
    assert.deepEqual(enteredGuests(TRACES, allowed), ["caro", "beto", "ana"]);
  });

  it("empty when nobody left a trace", () => {
    assert.deepEqual(enteredGuests([], allowed), []);
  });

  it("drops handles removed from the guest list (old photos and likes stay in the DB)", () => {
    const traces = [...TRACES, { handle: "echado", at: at("2026-10-11T02:00:00-03:00") }];
    assert.ok(!enteredGuests(traces, allowed).includes("echado"));
  });

  it("drops anything that isn't a valid handle, even if it got into the data", () => {
    const bad = ['x"><script>', "javascript:alert(1)", "a/../b", "UPPER", "a".repeat(31), ""];
    const traces = bad.map((handle) => ({ handle, at: at("2026-10-11T02:00:00-03:00") }));
    assert.deepEqual(enteredGuests(traces, new Set(bad)), []);
  });

  it("same timestamp: alphabetical, so the order doesn't jump between refreshes", () => {
    const t = at("2026-10-11T00:00:00-03:00");
    const traces = [
      { handle: "beto", at: t },
      { handle: "ana", at: t },
    ];
    assert.deepEqual(enteredGuests(traces, allowed), ["ana", "beto"]);
  });
});

describe("instagramProfileUrl", () => {
  it("canonical profile URL for a valid handle", () => {
    assert.equal(instagramProfileUrl("juan.perez_92"), "https://www.instagram.com/juan.perez_92/");
  });

  it("null for anything outside [a-z0-9._]{1,30}", () => {
    for (const h of [
      "",
      "Juan",
      "@juan",
      "juan perez",
      "juan/../../evil",
      "juan?x=1",
      "juan#x",
      "javascript:alert(1)",
      "évelyn",
      "a".repeat(31),
    ]) {
      assert.equal(instagramProfileUrl(h), null, h);
    }
  });

  it("accepts the 30-character limit", () => {
    assert.equal(instagramProfileUrl("a".repeat(30)), `https://www.instagram.com/${"a".repeat(30)}/`);
  });
});
