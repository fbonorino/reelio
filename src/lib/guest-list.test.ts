import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  enteredGuests,
  guestListResult,
  type AllowedGuest,
  type GuestListDeps,
  type GuestTrace,
} from "./guest-list.ts";
import { checkInGuest, type EntryStore } from "./entry.ts";
import { instagramProfileUrl, NOT_INVITED } from "./instagram.ts";

const at = (iso: string) => new Date(iso);

const ALLOWED = ["ana", "beto", "caro", "dani", "nunca.entro", "solo.entro"];
/** Guest-list rows: "solo.entro" opened the app (firstEnteredAt) but never uploaded, liked or asked. */
const GUESTS: AllowedGuest[] = ALLOWED.map((handle) => ({
  handle,
  firstEnteredAt: handle === "solo.entro" ? at("2026-10-11T00:00:00-03:00") : null,
}));
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
    allowedGuests: async () => (calls.allowed++, GUESTS),
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
    assert.deepEqual(res.body, { handles: ["caro", "solo.entro", "beto", "ana"] });
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

const guests = (entries: Record<string, string> = {}): AllowedGuest[] =>
  ALLOWED.map((handle) => ({ handle, firstEnteredAt: entries[handle] ? at(entries[handle]) : null }));

describe("enteredGuests", () => {
  const allowed = guests();

  it("newest first by first trace, one row per guest", () => {
    assert.deepEqual(enteredGuests(TRACES, allowed), ["caro", "beto", "ana"]);
  });

  it("empty when nobody came in or left a trace", () => {
    assert.deepEqual(enteredGuests([], allowed), []);
  });

  it("includes a guest who only came in, with no photo, like or request", () => {
    const list = enteredGuests([], guests({ dani: "2026-10-10T23:00:00-03:00" }));
    assert.deepEqual(list, ["dani"]);
  });

  it("doesn't include a guest who never came in", () => {
    const list = enteredGuests(TRACES, guests({ dani: "2026-10-10T23:00:00-03:00" }));
    assert.ok(!list.includes("nunca.entro"));
    assert.ok(!list.includes("solo.entro"));
  });

  it("guests from before firstEnteredAt existed still show, by their traces", () => {
    // Ana and Beto came in before the migration: their firstEnteredAt is null.
    const list = enteredGuests(TRACES, guests({ dani: "2026-10-11T02:00:00-03:00" }));
    assert.deepEqual(list, ["dani", "caro", "beto", "ana"]);
  });

  it("orders by the earliest date available: a later firstEnteredAt doesn't move an earlier trace", () => {
    // Ana's first photo was 23:10; her firstEnteredAt got set after the deploy, at 02:30.
    const list = enteredGuests(TRACES, guests({ ana: "2026-10-11T02:30:00-03:00" }));
    assert.deepEqual(list, ["caro", "beto", "ana"]);
  });

  it("and an earlier firstEnteredAt wins over a later trace", () => {
    // Beto came in at 22:00 and liked his first photo at 23:40.
    const list = enteredGuests(TRACES, guests({ beto: "2026-10-10T22:00:00-03:00" }));
    assert.deepEqual(list, ["caro", "ana", "beto"]);
  });

  it("drops handles removed from the guest list (old photos and likes stay in the DB)", () => {
    const traces = [...TRACES, { handle: "echado", at: at("2026-10-11T02:00:00-03:00") }];
    assert.ok(!enteredGuests(traces, allowed).includes("echado"));
  });

  it("drops anything that isn't a valid handle, even if it got into the data", () => {
    const bad = ['x"><script>', "javascript:alert(1)", "a/../b", "UPPER", "a".repeat(31), ""];
    const t = at("2026-10-11T02:00:00-03:00");
    const traces = bad.map((handle) => ({ handle, at: t }));
    const rows = bad.map((handle) => ({ handle, firstEnteredAt: t }));
    assert.deepEqual(enteredGuests(traces, rows), []);
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

/** In-memory guest list that applies the update the way the SQL does: only where it's still null. */
function fakeStore(handles: string[]) {
  const rows = new Map(handles.map((h) => [h, { firstEnteredAt: null as Date | null }]));
  const writes: string[] = [];
  const store: EntryStore = {
    find: async (h) => {
      const row = rows.get(h);
      return row ? { ...row } : null;
    },
    setFirstEnteredIfUnset: async (h, when) => {
      writes.push(h);
      const row = rows.get(h);
      if (row && row.firstEnteredAt === null) row.firstEnteredAt = when;
    },
  };
  return { store, rows, writes };
}

describe("checkInGuest: firstEnteredAt", () => {
  const T1 = at("2026-10-10T23:00:00-03:00");
  const T2 = at("2026-10-11T01:00:00-03:00");

  it("set on the first successful check", async () => {
    const { store, rows } = fakeStore(["ana"]);
    assert.equal(await checkInGuest("ana", store, T1), true);
    assert.deepEqual(rows.get("ana")?.firstEnteredAt, T1);
  });

  it("set only once: later checks don't overwrite it, and don't write at all", async () => {
    const { store, rows, writes } = fakeStore(["ana"]);
    await checkInGuest("ana", store, T1);
    await checkInGuest("ana", store, T2);
    await checkInGuest("ana", store, T2);
    assert.deepEqual(rows.get("ana")?.firstEnteredAt, T1);
    assert.deepEqual(writes, ["ana"]);
  });

  it("two requests racing on the first open: the first write stays", async () => {
    const { store, rows } = fakeStore(["ana"]);
    // Both read null before either writes.
    await Promise.all([checkInGuest("ana", store, T1), checkInGuest("ana", store, T2)]);
    assert.deepEqual(rows.get("ana")?.firstEnteredAt, T1);
  });

  it("not on the guest list: false, and nothing is written", async () => {
    const { store, writes } = fakeStore(["ana"]);
    assert.equal(await checkInGuest("colado", store, T1), false);
    assert.deepEqual(writes, []);
  });

  it("a guest who was checked in shows up in the list; one who wasn't doesn't", async () => {
    const { store, rows } = fakeStore(["ana", "beto"]);
    await checkInGuest("ana", store, T1);
    const list = enteredGuests(
      [],
      [...rows].map(([handle, r]) => ({ handle, firstEnteredAt: r.firstEnteredAt }))
    );
    assert.deepEqual(list, ["ana"]);
  });
});
