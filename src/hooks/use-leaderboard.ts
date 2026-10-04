"use client";

import useSWR from "swr";
import type { LeaderboardEntry } from "@/lib/types";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

/**
 * The live ranking. Every caller shares one SWR key, so there's a single poll. Pass
 * `enabled: false` to skip fetching (and polling) while nothing on screen needs it.
 */
export function useLeaderboard(enabled = true) {
  return useSWR<{ leaderboard: LeaderboardEntry[] }>(enabled ? "/api/leaderboard" : null, fetcher, {
    refreshInterval: 4000,
    revalidateOnFocus: true,
  });
}
