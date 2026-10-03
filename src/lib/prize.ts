import type { LeaderboardEntry } from "@/lib/types";

/** Play and stay on the scoreboard, but can't win the prize (the birthday boy hands it out). */
export const EXCLUDED_FROM_PRIZE = ["fran_bonorino"];

export function isExcludedFromPrize(instagram: string) {
  return EXCLUDED_FROM_PRIZE.includes(instagram);
}

export type PrizeStats = Pick<
  LeaderboardEntry,
  "instagram" | "score" | "likes" | "topPhoto" | "lastScoredAt"
>;

/**
 * Tiebreak levels, in order: (a) total points, (b) total likes received, (c) best single photo,
 * (d) reached that score first (oldest last scoring event), (e) handle, alphabetically.
 */
export type TiebreakLevel = "a" | "b" | "c" | "d" | "e";

export const TIEBREAK_LABELS: Record<TiebreakLevel, string> = {
  a: "más puntos totales",
  b: "más likes recibidos",
  c: "mejor foto individual",
  d: "llegó primero a ese puntaje",
  e: "orden alfabético",
};

function scoredAt(p: PrizeStats) {
  // No scoring event on record sorts last.
  return p.lastScoredAt ? Date.parse(p.lastScoredAt) : Infinity;
}

/** Each level as a comparison: negative when `x` should finish ahead of `y`. */
const LEVELS: [TiebreakLevel, (x: PrizeStats, y: PrizeStats) => number][] = [
  ["a", (x, y) => y.score - x.score],
  ["b", (x, y) => y.likes - x.likes],
  ["c", (x, y) => (y.topPhoto?.points ?? 0) - (x.topPhoto?.points ?? 0)],
  ["d", (x, y) => Math.sign(scoredAt(x) - scoredAt(y))],
  ["e", (x, y) => x.instagram.localeCompare(y.instagram)],
];

/** The first level that tells `x` and `y` apart (only "e" for the very same handle). */
export function tiebreakLevel(x: PrizeStats, y: PrizeStats): TiebreakLevel {
  return LEVELS.find(([, compare]) => compare(x, y) !== 0)?.[0] ?? "e";
}

/** Sort comparator: negative when `x` should finish ahead of `y`. Never 0 for distinct handles. */
export function compareForPrize(x: PrizeStats, y: PrizeStats) {
  for (const [, compare] of LEVELS) {
    const result = compare(x, y);
    if (result !== 0) return result;
  }
  return 0;
}

/**
 * Final standings for the prize: excluded players left out, everyone else in a strict order
 * with no shared places. The first one is the one and only winner.
 */
export function prizeStandings<T extends PrizeStats>(entries: T[]): T[] {
  return entries.filter((e) => !isExcludedFromPrize(e.instagram)).sort(compareForPrize);
}
