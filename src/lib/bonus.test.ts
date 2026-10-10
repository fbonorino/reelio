import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  BONUS_EXTRA_PHOTOS,
  BONUS_GRACE_MS,
  bonusClosesAt,
  bonusPhase,
  checkBonusWindow,
  DEFAULT_BONUS_SETTINGS,
  effectivePoints,
  formatBonusTime,
  guestChallenges,
  type BonusSettings,
} from "./bonus.ts";
import { issueBonusTicket, readBonusTicket } from "./bonus-ticket.ts";
import { quotaError, tallyPhotos } from "./quota.ts";
import { photoScore } from "./ranking.ts";
import { MAX_PHOTOS_PER_USER } from "./challenges.ts";

/** Every "now" in these tests is injected: nothing reads the real clock. */
const at = (iso: string) => new Date(iso).getTime();
const START = at("2026-10-11T03:00:00-03:00");
const END = at("2026-10-11T04:00:00-03:00");
const EVENT_END = new Date("2026-10-11T04:00:00-03:00");

function settings(overrides: Partial<BonusSettings> = {}): BonusSettings {
  return { ...DEFAULT_BONUS_SETTINGS, ...overrides };
}

describe("defaults", () => {
  it("open Sunday 11/10 from 3:00 to 4:00 Buenos Aires time, stored as UTC", () => {
    assert.equal(DEFAULT_BONUS_SETTINGS.startsAt.toISOString(), "2026-10-11T06:00:00.000Z");
    assert.equal(DEFAULT_BONUS_SETTINGS.endsAt.toISOString(), "2026-10-11T07:00:00.000Z");
    assert.equal(formatBonusTime(DEFAULT_BONUS_SETTINGS.startsAt), "3:00");
  });
});

describe("bonusPhase", () => {
  const s = settings();

  it("before the window: hidden", () => {
    assert.equal(bonusPhase(s, EVENT_END, at("2026-10-10T23:30:00-03:00")), "before");
    assert.equal(bonusPhase(s, EVENT_END, START - 1), "before");
  });

  it("opens exactly at bonusStartsAt", () => {
    assert.equal(bonusPhase(s, EVENT_END, START), "open");
  });

  it("during the window: open", () => {
    assert.equal(bonusPhase(s, EVENT_END, at("2026-10-11T03:30:00-03:00")), "open");
    assert.equal(bonusPhase(s, EVENT_END, END - 1), "open");
  });

  it("closes exactly at bonusEndsAt", () => {
    assert.equal(bonusPhase(s, EVENT_END, END), "closed");
  });

  it("after the window: closed", () => {
    assert.equal(bonusPhase(s, EVENT_END, at("2026-10-11T05:00:00-03:00")), "closed");
  });

  it("never runs past the game's close, even if bonusEndsAt says so", () => {
    const late = settings({ endsAt: new Date("2026-10-11T05:00:00-03:00") });
    const earlyClose = new Date("2026-10-11T03:30:00-03:00");
    assert.equal(bonusPhase(late, earlyClose, at("2026-10-11T03:29:59-03:00")), "open");
    assert.equal(bonusPhase(late, earlyClose, earlyClose.getTime()), "closed");
    assert.equal(bonusClosesAt(late, earlyClose)?.getTime(), earlyClose.getTime());
  });

  it("works without a game close configured", () => {
    assert.equal(bonusPhase(s, null, START), "open");
    assert.equal(bonusPhase(s, null, END), "closed");
  });
});

describe("manual override", () => {
  const earlier = at("2026-10-10T22:00:00-03:00");

  it("forced open: open before the window, and after it", () => {
    const s = settings({ override: "OPEN", overrideAt: new Date(earlier), revealedAt: new Date(earlier) });
    assert.equal(bonusPhase(s, EVENT_END, earlier), "open");
    assert.equal(bonusPhase(s, null, END + 3_600_000), "open");
  });

  it("forced open still can't outlive the game", () => {
    const s = settings({ override: "OPEN", revealedAt: new Date(earlier) });
    assert.equal(bonusPhase(s, EVENT_END, EVENT_END.getTime()), "closed");
  });

  it("forced closed: closed in the middle of the window", () => {
    const s = settings({ override: "CLOSED", overrideAt: new Date(START + 60_000) });
    assert.equal(bonusPhase(s, EVENT_END, START + 120_000), "closed");
  });

  it("forced closed before 3:00 without ever opening: still secret", () => {
    const s = settings({ override: "CLOSED", overrideAt: new Date(earlier) });
    assert.equal(bonusPhase(s, EVENT_END, earlier + 1000), "before");
    // Then at 3:00 it's revealed, but stays closed.
    assert.equal(bonusPhase(s, EVENT_END, START), "closed");
  });

  it("forced closed after a forced open: stays visible (closed)", () => {
    const s = settings({ override: "CLOSED", overrideAt: new Date(earlier + 5000), revealedAt: new Date(earlier) });
    assert.equal(bonusPhase(s, EVENT_END, earlier + 6000), "closed");
  });

  describe("back to automatic: only the clock and the window count", () => {
    for (const [previous, s] of [
      ["after a forced open", settings({ override: "AUTO", overrideAt: new Date(earlier + 5000), revealedAt: new Date(earlier) })],
      ["after a forced close", settings({ override: "AUTO", overrideAt: new Date(earlier + 5000) })],
      ["after a forced open and then a forced close", settings({ override: "AUTO", overrideAt: new Date(earlier + 9000), revealedAt: new Date(earlier) })],
    ] as const) {
      it(`${previous}: before the window it's "before" (secret again)`, () => {
        assert.equal(bonusPhase(s, EVENT_END, earlier + 10_000), "before");
        assert.equal(bonusPhase(s, EVENT_END, START - 1), "before");
        assert.equal(guestChallenges([], [{ id: "b", label: "secreta", points: 15 }], bonusPhase(s, EVENT_END, START - 1)).bonus.length, 0);
        assert.equal(checkBonusWindow(s, EVENT_END, START - 1, null).ok, false);
      });
      it(`${previous}: during the window it's open`, () => {
        assert.equal(bonusPhase(s, EVENT_END, START), "open");
        assert.equal(bonusPhase(s, EVENT_END, END - 1), "open");
      });
      it(`${previous}: after the window it's closed`, () => {
        assert.equal(bonusPhase(s, EVENT_END, END), "closed");
        assert.equal(bonusPhase(s, EVENT_END, END + 3_600_000), "closed");
      });
    }
  });

  it("back to automatic: follows the schedule again", () => {
    const s = settings({ override: "AUTO", revealedAt: new Date(earlier) });
    assert.equal(bonusPhase(s, EVENT_END, START + 1), "open");
    assert.equal(bonusPhase(s, EVENT_END, END), "closed");
  });
});

describe("checkBonusWindow (server-side upload check)", () => {
  const s = settings();

  it("accepts during the window", () => {
    assert.deepEqual(checkBonusWindow(s, EVENT_END, START + 10_000, null), { ok: true, late: false });
  });

  it("rejects before it opens, without saying anything about the challenge", () => {
    const result = checkBonusWindow(s, EVENT_END, START - 1, null);
    assert.equal(result.ok, false);
    assert.equal(!result.ok && result.error, "Esa consigna ya no está, elegí otra");
    assert.equal(!result.ok && result.hidden, true);
  });

  it("rejects after the close without a ticket", () => {
    assert.equal(checkBonusWindow(s, EVENT_END, END, null).ok, false);
    assert.equal(checkBonusWindow(s, EVENT_END, END + 1000, null).ok, false);
  });

  it("60 s grace if the upload started before the close", () => {
    const startedAt = END - 30_000;
    assert.deepEqual(checkBonusWindow(s, EVENT_END, END + 1, startedAt), { ok: true, late: true });
    assert.deepEqual(checkBonusWindow(s, EVENT_END, END + BONUS_GRACE_MS, startedAt), { ok: true, late: true });
    assert.equal(checkBonusWindow(s, EVENT_END, END + BONUS_GRACE_MS + 1, startedAt).ok, false);
  });

  it("no grace for an upload that started at or after the close", () => {
    assert.equal(checkBonusWindow(s, EVENT_END, END + 5000, END).ok, false);
    assert.equal(checkBonusWindow(s, EVENT_END, END + 5000, END + 1000).ok, false);
  });

  it("no grace for a ticket from long ago", () => {
    assert.equal(checkBonusWindow(s, EVENT_END, END + 1000, START).ok, false);
  });

  it("forced closed: rejects, with the grace counted from when the host closed it", () => {
    const closedAt = START + 10 * 60_000;
    const closed = settings({ override: "CLOSED", overrideAt: new Date(closedAt) });
    assert.equal(checkBonusWindow(closed, EVENT_END, closedAt + 1000, null).ok, false);
    assert.deepEqual(checkBonusWindow(closed, EVENT_END, closedAt + 1000, closedAt - 5000), { ok: true, late: true });
    assert.equal(checkBonusWindow(closed, EVENT_END, closedAt + BONUS_GRACE_MS + 1, closedAt - 5000).ok, false);
  });

  it("forced open: accepts outside the scheduled window", () => {
    const open = settings({ override: "OPEN", revealedAt: new Date(START - 3_600_000) });
    assert.deepEqual(checkBonusWindow(open, EVENT_END, START - 1000, null), { ok: true, late: false });
  });
});

describe("bonus ticket", () => {
  const secret = "s3cret";

  it("round-trips the server time it was issued at", () => {
    assert.equal(readBonusTicket(issueBonusTicket("ana", START, secret), "ana", secret), START);
  });

  it("rejects another guest's ticket, a backdated one, garbage or no secret", () => {
    const ticket = issueBonusTicket("ana", START, secret);
    assert.equal(readBonusTicket(ticket, "beto", secret), null);
    assert.equal(readBonusTicket(ticket.replace(String(START), String(START - 60_000)), "ana", secret), null);
    assert.equal(readBonusTicket("nope", "ana", secret), null);
    assert.equal(readBonusTicket(undefined, "ana", secret), null);
    assert.equal(readBonusTicket(ticket, "ana", ""), null);
  });
});

describe("quota", () => {
  const challengePhotos = Array.from({ length: MAX_PHOTOS_PER_USER }, (_, i) => ({ challengeId: `c${i}`, isBonus: false }));

  it("bonus photos have their own cap, separate from the regular one", () => {
    // Regular quota used up: bonus still available.
    assert.equal(quotaError("challenge", "c9", challengePhotos)?.limit, true);
    assert.equal(quotaError("bonus", "b1", challengePhotos), null);
    // Bonus photos don't eat into the regular quota.
    const bonusPhotos = [{ challengeId: "b1", isBonus: true }, { challengeId: "b2", isBonus: true }];
    assert.deepEqual(tallyPhotos(bonusPhotos), { challenge: 0, free: 0, bonus: 2 });
    assert.equal(quotaError("challenge", "c1", bonusPhotos), null);
  });

  it(`stops at ${BONUS_EXTRA_PHOTOS} bonus photos`, () => {
    const three = ["b1", "b2", "b3"].map((challengeId) => ({ challengeId, isBonus: true }));
    const rejected = quotaError("bonus", "b4", three);
    assert.equal(rejected?.limit, true);
    assert.match(rejected!.error, /3 fotos del bonus track/);
  });

  it("one photo per bonus challenge per guest", () => {
    const rejected = quotaError("bonus", "b1", [{ challengeId: "b1", isBonus: true }]);
    assert.deepEqual(rejected, { error: "Ya subiste una foto para esa consigna bonus", limit: false });
    assert.equal(quotaError("bonus", "b2", [{ challengeId: "b1", isBonus: true }]), null);
  });

  it("regular challenges can still repeat", () => {
    assert.equal(quotaError("challenge", "c1", [{ challengeId: "c1", isBonus: false }]), null);
  });
});

describe("points", () => {
  it("the multiplier applies to the challenge points", () => {
    assert.equal(effectivePoints({ points: 15, isBonus: true }), 30);
    assert.equal(effectivePoints({ points: 20, isBonus: true }), 40);
    assert.equal(effectivePoints({ points: 25, isBonus: true }), 50);
    assert.equal(effectivePoints({ points: 25, isBonus: false }), 25);
  });

  it("likes stay +1 each, not multiplied", () => {
    const challengePoints = effectivePoints({ points: 15, isBonus: true });
    assert.equal(photoScore({ challengePoints, invalidated: false, likeCount: 4 }), 34);
  });

  it("the host's discount on a bonus photo takes away the effective points", () => {
    const photo = { challengePoints: effectivePoints({ points: 15, isBonus: true }), invalidated: false, likeCount: 4 };
    const before = photoScore(photo);
    const after = photoScore({ ...photo, invalidated: true });
    assert.equal(before - after, 30);
    assert.equal(after, 4);
  });
});

describe("secret until it opens", () => {
  const regular = [{ id: "pelado", label: "Foto con un pelado", points: 7 }];
  const bonus = [
    { id: "lindx", label: "Foto con el más lindx de la noche", points: 15 },
    { id: "pico", label: "Foto pico con alguien", points: 25 },
  ];

  it("before: no bonus id or text anywhere in the guests' payload", () => {
    const json = JSON.stringify(guestChallenges(regular, bonus, "before"));
    for (const c of bonus) {
      assert.ok(!json.includes(c.id), `leaked id ${c.id}`);
      assert.ok(!json.includes(c.label), `leaked label ${c.label}`);
    }
    assert.ok(json.includes("Foto con un pelado"));
  });

  it("open: listed with effective points", () => {
    const payload = guestChallenges(regular, bonus, "open");
    assert.deepEqual(
      payload.bonus.map((c) => [c.label, c.points, c.bonus]),
      [
        ["Foto con el más lindx de la noche", 30, true],
        ["Foto pico con alguien", 50, true],
      ]
    );
    assert.equal(payload.challenges[0].points, 7);
  });

  it("closed: still listed (the app shows them disabled)", () => {
    assert.equal(guestChallenges(regular, bonus, "closed").bonus.length, 2);
  });
});
