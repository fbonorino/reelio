"use client";

import { InstagramLink } from "@/components/photo-meta";
import { Button } from "@/components/ui/button";
import { useLeaderboard } from "@/hooks/use-leaderboard";
import { prizeStandings } from "@/lib/prize";
import type { LeaderboardEntry } from "@/lib/types";

/**
 * Permanent winner announcement, shown once the game has closed. `onShowWinner` adds a
 * button that reopens the full-screen announcement.
 */
export function WinnerBanner({
  winner,
  onShowWinner,
}: {
  winner: LeaderboardEntry | null;
  onShowWinner?: () => void;
}) {
  return (
    <div className="mb-3 rounded-lg bg-amber-400/10 px-3 py-2.5 text-center text-sm text-zinc-100 ring-2 ring-amber-400">
      {!winner ? (
        <p>🏆 Se terminó el juego, pero nadie sumó puntos.</p>
      ) : (
        <>
          <p>
            🏆 ¡<InstagramLink handle={winner.instagram} className="text-amber-300" /> ganó con{" "}
            <span className="font-display text-base tracking-wide text-amber-400">{winner.score}</span>{" "}
            puntos! Andá a reclamar tu premio.
          </p>
          {onShowWinner && (
            <Button
              size="sm"
              onClick={onShowWinner}
              className="mt-2 bg-amber-400 font-semibold text-zinc-950 hover:bg-amber-300"
            >
              Ver ganador
            </Button>
          )}
        </>
      )}
    </div>
  );
}

/** Replaces the rules in onboarding once the game has closed: who won, and that uploads are still open. */
export function GameOverNotice() {
  const { data } = useLeaderboard();
  const winner = data && prizeStandings(data.leaderboard)[0];

  return (
    <div className="space-y-3 text-sm text-zinc-200">
      <p className="text-base">
        🎉 El juego terminó
        {winner && (
          <>
            {" "}— ¡<InstagramLink handle={winner.instagram} className="text-amber-300" /> se lleva el
            premio!
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
