"use client";

import useSWR from "swr";
import type { LeaderboardEntry } from "@/lib/types";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

/** The live ranking. Every caller shares one SWR key, so there's a single poll. */
export function useLeaderboard() {
  return useSWR<{ leaderboard: LeaderboardEntry[] }>("/api/leaderboard", fetcher, {
    refreshInterval: 4000,
    revalidateOnFocus: true,
  });
}
