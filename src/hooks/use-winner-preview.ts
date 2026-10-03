"use client";

import { useSyncExternalStore } from "react";
import useSWR from "swr";
import { normalizeInstagram } from "@/lib/instagram";
import { isExcludedFromPrize } from "@/lib/prize";
import { rankEntries } from "@/lib/ranking";
import type { LeaderboardEntry } from "@/lib/types";

export type WinnerPreview = {
  /** Handle to view the announcement as (`&as=`), instead of the one saved on this device. */
  as: string | null;
  /** `&tie=1`: sample players tied on points, to watch the tiebreak pick a single winner. */
  tie: boolean;
};

const noopSubscribe = () => () => {};

/**
 * `?preview=winner&key=HOST_SECRET[&as=handle][&tie=1]` shows the winner announcement right
 * away, for rehearsing it before the game closes. Null unless the key checks out with the
 * server. Read-only: it never touches the database, the game state or the saved handle.
 */
export function useWinnerPreview(): WinnerPreview | null {
  const search = useSyncExternalStore(noopSubscribe, () => window.location.search, () => "");
  const params = new URLSearchParams(search);
  const key = params.get("key");
  const requested = params.get("preview") === "winner" && !!key;

  const { data: verified } = useSWR(
    requested ? `/api/host/verify?key=${encodeURIComponent(key)}` : null,
    (url: string) => fetch(url).then((res) => res.ok),
    { revalidateOnFocus: false }
  );

  if (!requested || !verified) return null;
  return { as: normalizeInstagram(params.get("as")), tie: params.get("tie") === "1" };
}

type Sample = Omit<LeaderboardEntry, "rank" | "photoCount" | "topPhoto">;

/** Samples have no real photo, so their best photo counts as 0 for the tiebreak (all tied on c). */
function toEntry(s: Sample): Omit<LeaderboardEntry, "rank"> {
  return { ...s, photoCount: 3, topPhoto: null };
}

/**
 * `&tie=1`: invitado_2 and invitado_3 tie on points, likes and best photo (none), so (d) decides:
 * invitado_2 reached 120 first. fran_bonorino tops the scoreboard but is out of the prize.
 */
const TIE_SAMPLE: Sample[] = [
  { instagram: "fran_bonorino", score: 150, likes: 20, lastScoredAt: "2026-09-28T00:50:00-03:00" },
  { instagram: "invitado_2", score: 120, likes: 18, lastScoredAt: "2026-09-28T01:12:00-03:00" },
  { instagram: "invitado_3", score: 120, likes: 18, lastScoredAt: "2026-09-28T01:47:00-03:00" },
  { instagram: "invitado_4", score: 85, likes: 9, lastScoredAt: "2026-09-28T02:30:00-03:00" },
];

const FILLER_HANDLES = ["invitado_2", "invitado_3", "invitado_4"];

/**
 * Preview only. With `tie`, the tie sample. Otherwise the real ranking, topped up with sample
 * players below everyone else when fewer than 3 can win the prize.
 */
export function previewLeaderboard(entries: LeaderboardEntry[], tie: boolean): LeaderboardEntry[] {
  if (tie) return rankEntries(TIE_SAMPLE.map(toEntry));

  const eligible = entries.filter((e) => !isExcludedFromPrize(e.instagram)).length;
  if (eligible >= 3) return entries;

  const lowest = entries.length > 0 ? Math.min(...entries.map((e) => e.score)) : 110;
  const fillers = FILLER_HANDLES.filter((h) => !entries.some((e) => e.instagram === h))
    .slice(0, 3 - eligible)
    .map((instagram, i) =>
      toEntry({
        instagram,
        score: Math.max(0, lowest - 10 * (i + 1)),
        likes: 5,
        lastScoredAt: "2026-09-28T02:00:00-03:00",
      })
    );
  return rankEntries([...entries, ...fillers]);
}
