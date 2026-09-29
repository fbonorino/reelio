"use client";

import { Fragment } from "react";
import useSWR from "swr";
import { InstagramLink } from "@/components/photo-meta";
import type { LeaderboardEntry } from "@/lib/types";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

/** Every player tied for first (rank 1 is shared on ties), or undefined while loading. */
function useWinners() {
  // Same SWR key and interval as the Ranking tab, so the poll is shared.
  const { data } = useSWR<{ leaderboard: LeaderboardEntry[] }>("/api/leaderboard", fetcher, {
    refreshInterval: 4000,
    revalidateOnFocus: true,
  });
  return data?.leaderboard.filter((entry) => entry.rank === 1);
}

/** "@a", "@a y @b", "@a, @b y @c". */
function WinnerNames({ winners }: { winners: LeaderboardEntry[] }) {
  return winners.map((w, i) => (
    <Fragment key={w.instagram}>
      {i > 0 && (i === winners.length - 1 ? " y " : ", ")}
      <InstagramLink handle={w.instagram} className="text-amber-300" />
    </Fragment>
  ));
}

/** Permanent winner announcement, shown once the game has closed. */
export function WinnerBanner() {
  const winners = useWinners();
  if (!winners) return null;

  return (
    <div className="mb-3 rounded-lg bg-amber-400/10 px-3 py-2.5 text-center text-sm text-zinc-100 ring-2 ring-amber-400">
      {winners.length === 0 ? (
        <p>🏆 Se terminó el juego, pero nadie sumó puntos.</p>
      ) : (
        <p>
          🏆 ¡<WinnerNames winners={winners} />{" "}
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

/** Replaces the rules in onboarding once the game has closed: who won, and that uploads are still open. */
export function GameOverNotice() {
  const winners = useWinners();

  return (
    <div className="space-y-3 text-sm text-zinc-200">
      <p className="text-base">
        🎉 El juego terminó
        {winners && winners.length > 0 && (
          <>
            {" "}— ¡<WinnerNames winners={winners} />{" "}
            {winners.length === 1 ? "se lleva el premio" : "empataron y se llevan el premio"}!
          </>
        )}
      </p>
      <p>
        Pero la fiesta sigue: subí tus fotos de la noche, quedan de recuerdo{" "}
        <span className="font-semibold text-sky-300">(ya no suman puntos)</span>.
      </p>
    </div>
  );
}
