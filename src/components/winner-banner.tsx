"use client";

import { Fragment } from "react";
import useSWR from "swr";
import { InstagramLink } from "@/components/photo-meta";
import type { LeaderboardEntry } from "@/lib/types";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

/** Permanent winner announcement, shown once the game has closed. */
export function WinnerBanner() {
  // Same SWR key and interval as the Ranking tab, so the poll is shared.
  const { data } = useSWR<{ leaderboard: LeaderboardEntry[] }>("/api/leaderboard", fetcher, {
    refreshInterval: 4000,
    revalidateOnFocus: true,
  });

  if (!data) return null;

  // rank 1 is shared on ties, so this is every player tied for first.
  const winners = data.leaderboard.filter((entry) => entry.rank === 1);

  return (
    <div className="mb-3 rounded-lg bg-amber-400/10 px-3 py-2.5 text-center text-sm text-zinc-100 ring-2 ring-amber-400">
      {winners.length === 0 ? (
        <p>🏆 Se terminó el juego, pero nadie sumó puntos.</p>
      ) : (
        <p>
          🏆 ¡
          {winners.map((w, i) => (
            <Fragment key={w.instagram}>
              {i > 0 && (i === winners.length - 1 ? " y " : ", ")}
              <InstagramLink handle={w.instagram} className="text-amber-300" />
            </Fragment>
          ))}{" "}
          {winners.length === 1 ? "ganó" : "empataron"} con{" "}
          <span className="font-display text-base tracking-wide text-amber-400">
            {winners[0].score}
          </span>{" "}
          puntos! {winners.length === 1 ? "Andá a reclamar tu premio." : "Vayan a reclamar su premio."}
        </p>
      )}
    </div>
  );
}
