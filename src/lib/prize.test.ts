import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { compareForPrize, prizeStandings, tiebreakLevel, type PrizeStats } from "./prize.ts";

type PlayerOptions = {
  score?: number;
  likes?: number;
  /** Points of the best photo; null for no photo on record. */
  topPhoto?: number | null;
  lastScoredAt?: string | null;
};

/** A player tied with every other default player on every level but the handle. */
function player(
  instagram: string,
  { score = 50, likes = 5, topPhoto = 10, lastScoredAt = "2026-09-28T02:00:00.000Z" }: PlayerOptions = {}
): PrizeStats {
  return {
    instagram,
    score,
    likes,
    lastScoredAt,
    topPhoto:
      topPhoto === null ? null : { id: instagram, url: "", thumbnailUrl: "", type: "IMAGE", points: topPhoto },
  };
}

/** Winner of a two-player tiebreak, whichever order they come in. */
function winner(x: PrizeStats, y: PrizeStats) {
  const a = prizeStandings([x, y])[0].instagram;
  const b = prizeStandings([y, x])[0].instagram;
  assert.equal(a, b, "result must not depend on input order");
  return a;
}

describe("prize tiebreak", () => {
  it("(a) more total points wins", () => {
    const x = player("zeta", { score: 60, likes: 0, topPhoto: 1 });
    const y = player("alfa", { score: 59, likes: 99, topPhoto: 99 });
    assert.equal(winner(x, y), "zeta");
    assert.equal(tiebreakLevel(x, y), "a");
  });

  it("(b) tied on points: more likes received wins", () => {
    const x = player("zeta", { likes: 8, topPhoto: 1 });
    const y = player("alfa", { likes: 7, topPhoto: 40 });
    assert.equal(winner(x, y), "zeta");
    assert.equal(tiebreakLevel(x, y), "b");
  });

  it("(c) tied on points and likes: best single photo wins", () => {
    const x = player("zeta", { topPhoto: 42, lastScoredAt: "2026-09-28T03:59:00.000Z" });
    const y = player("alfa", { topPhoto: 32, lastScoredAt: "2026-09-28T00:10:00.000Z" });
    assert.equal(winner(x, y), "zeta");
    assert.equal(tiebreakLevel(x, y), "c");
  });

  it("(c) a player with no photo on record counts as 0", () => {
    const x = player("zeta", { topPhoto: 1 });
    const y = player("alfa", { topPhoto: null });
    assert.equal(winner(x, y), "zeta");
    assert.equal(tiebreakLevel(x, y), "c");
  });

  it("(d) tied on a, b and c: whoever reached the score first wins", () => {
    const x = player("zeta", { lastScoredAt: "2026-09-28T01:12:00.000Z" });
    const y = player("alfa", { lastScoredAt: "2026-09-28T01:47:00.000Z" });
    assert.equal(winner(x, y), "zeta");
    assert.equal(tiebreakLevel(x, y), "d");
  });

  it("(d) no scoring event on record loses to any timestamp", () => {
    const x = player("zeta");
    const y = player("alfa", { lastScoredAt: null });
    assert.equal(winner(x, y), "zeta");
    assert.equal(tiebreakLevel(x, y), "d");
  });

  it("(e) identical on everything: alphabetical by handle", () => {
    const x = player("beto");
    const y = player("ana");
    assert.equal(winner(x, y), "ana");
    assert.equal(tiebreakLevel(x, y), "e");
  });

  it("never leaves two players tied", () => {
    assert.notEqual(compareForPrize(player("ana"), player("beto")), 0);
  });
});

describe("prizeStandings", () => {
  it("leaves out excluded players, even when they have the most points", () => {
    const standings = prizeStandings([
      player("fran_bonorino", { score: 500 }),
      player("ana", { score: 30 }),
      player("beto", { score: 40 }),
    ]);
    assert.deepEqual(standings.map((p) => p.instagram), ["beto", "ana"]);
  });

  it("orders a full field level by level", () => {
    const standings = prizeStandings([
      player("e_handle_b"),
      player("d_later", { lastScoredAt: "2026-09-28T03:00:00.000Z" }),
      player("c_photo", { topPhoto: 30 }),
      player("b_likes", { likes: 9 }),
      player("a_points", { score: 90 }),
      player("e_handle_a"),
    ]);
    assert.deepEqual(standings.map((p) => p.instagram), [
      "a_points",
      "b_likes",
      "c_photo",
      "e_handle_a",
      "e_handle_b",
      "d_later",
    ]);
  });

  it("doesn't mutate its input", () => {
    const input = [player("b", { score: 1 }), player("a", { score: 2 })];
    prizeStandings(input);
    assert.deepEqual(input.map((p) => p.instagram), ["b", "a"]);
  });
});
