"use client";

import useSWR from "swr";
import type { LeaderboardEntry } from "@/lib/types";
import { useFeedRefreshInterval } from "@/hooks/use-upload-activity";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

/**
 * The live ranking. Every caller shares one SWR key, so there's a single poll. Pass
 * `enabled: false` to skip fetching (and polling) while nothing on screen needs it.
 */
export function useLeaderboard(enabled = true) {
  // Every 10 s, not while this device uploads, and never in a hidden tab.
  const refreshInterval = useFeedRefreshInterval();
  return useSWR<{ leaderboard: LeaderboardEntry[] }>(enabled ? "/api/leaderboard" : null, fetcher, {
    refreshInterval,
    refreshWhenHidden: false,
    revalidateOnFocus: true,
  });
}
