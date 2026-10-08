"use client";

import useSWR from "swr";
import type { Challenge } from "@/lib/challenges";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

/** The challenges guests can pick, in the host's order. Undefined until the first load. */
export function useChallenges(): Challenge[] | undefined {
  // Polled so edits from /host show up mid-party without a reload.
  const { data } = useSWR<{ challenges: Challenge[] }>("/api/challenges", fetcher, {
    refreshInterval: 30000,
    revalidateOnFocus: true,
  });
  return data?.challenges;
}
