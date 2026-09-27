"use client";

import useSWR from "swr";
import { Trophy } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { InstagramLink } from "@/components/photo-meta";
import { useInstagram } from "@/lib/profile";
import { cn } from "@/lib/utils";
import type { LeaderboardEntry } from "@/lib/types";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const PODIUM = ["text-amber-400", "text-zinc-300", "text-orange-400"];

export function Leaderboard() {
  const myInstagram = useInstagram();
  const { data, isLoading } = useSWR<{ leaderboard: LeaderboardEntry[] }>(
    "/api/leaderboard",
    fetcher,
    { refreshInterval: 4000, revalidateOnFocus: true }
  );

  if (isLoading) {
    return (
      <div className="space-y-2 p-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full rounded-lg bg-zinc-900" />
        ))}
      </div>
    );
  }

  const entries = data?.leaderboard ?? [];

  if (entries.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 py-24 text-center text-zinc-500">
        <Trophy className="size-10" />
        <p className="text-base font-medium text-zinc-300">El ranking está vacío</p>
        <p className="text-sm">Subí la primera consigna y quedate con el primer puesto.</p>
      </div>
    );
  }

  return (
    <ol className="space-y-2 p-3 pb-32">
      {entries.map((entry) => {
        const isMe = entry.instagram === myInstagram;
        return (
          <li
            key={entry.instagram}
            className={cn(
              "flex items-center gap-3 rounded-lg bg-zinc-900 px-3 py-2.5 ring-1 ring-zinc-800",
              entry.rank === 1 && "ring-2 ring-amber-400",
              isMe && "bg-indigo-950/60 ring-indigo-500"
            )}
          >
            <span
              className={cn(
                "w-8 shrink-0 text-center font-display text-2xl text-zinc-500",
                PODIUM[entry.rank - 1]
              )}
            >
              {entry.rank}
            </span>
            <div className="min-w-0 flex-1">
              <InstagramLink handle={entry.instagram} className="block text-sm" />
              <p className="text-xs text-zinc-500">
                {entry.photoCount} {entry.photoCount === 1 ? "foto" : "fotos"}
                {isMe && " · vos"}
              </p>
            </div>
            <span className="shrink-0 font-display text-2xl tracking-wide text-zinc-50">
              {entry.score}
              <span className="ml-1 font-sans text-xs text-zinc-500">pts</span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}
