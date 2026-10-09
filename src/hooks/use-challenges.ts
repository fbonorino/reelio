"use client";

import useSWR from "swr";
import type { GuestChallenge } from "@/lib/bonus";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export const CHALLENGES_KEY = "/api/challenges";

function useChallengeLists() {
  // Polled so edits from /host show up mid-party without a reload.
  const { data } = useSWR<{ challenges: GuestChallenge[]; bonus: GuestChallenge[] }>(CHALLENGES_KEY, fetcher, {
    refreshInterval: 30000,
    revalidateOnFocus: true,
  });
  return data;
}

/** The challenges guests can pick, in the host's order. Undefined until the first load. */
export function useChallenges(): GuestChallenge[] | undefined {
  return useChallengeLists()?.challenges;
}

/**
 * Bonus track challenges, points already multiplied. Empty until the window opens: the server
 * doesn't send them before. Shares the request with useChallenges.
 */
export function useBonusChallenges(): GuestChallenge[] | undefined {
  return useChallengeLists()?.bonus;
}
