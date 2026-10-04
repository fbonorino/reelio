"use client";

import { useEffect, useState } from "react";
import { Dialog as DialogPrimitive } from "radix-ui";
import { Camera, Crown, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { WinnerBanner } from "@/components/winner-banner";
import { useLeaderboard } from "@/hooks/use-leaderboard";
import { previewLeaderboard, type WinnerPreview } from "@/hooks/use-winner-preview";
import { celebrate } from "@/lib/celebrate";
import { isExcludedFromPrize, prizeStandings, TIEBREAK_LABELS, tiebreakLevel } from "@/lib/prize";
import { cn } from "@/lib/utils";
import type { LeaderboardEntry } from "@/lib/types";

const SEEN_KEY = "reelio_winner_seen";

function readSeen() {
  try {
    return localStorage.getItem(SEEN_KEY) === "1";
  } catch {
    return false;
  }
}

function markSeen() {
  try {
    localStorage.setItem(SEEN_KEY, "1");
  } catch {
    // Private mode — they'll just get the announcement again on their next visit.
  }
}

/** Staggered entrance; skipped under prefers-reduced-motion. */
const ENTER = "animate-in fade-in zoom-in-90 fill-mode-both duration-500 motion-reduce:animate-none";

/**
 * Everything shown once the game closes: the winner banner in the header, and a full-screen
 * announcement that opens by itself once per device (then again from the banner's button).
 * With a host `preview`, it opens right away on any day and remembers nothing.
 */
export function GameOver({
  ended,
  instagram,
  preview,
}: {
  ended: boolean;
  instagram: string | null | undefined;
  preview: WinnerPreview | null;
}) {
  // Nothing to announce while the game runs, so don't poll the ranking for every guest all night.
  const { data } = useLeaderboard(ended || !!preview);
  const [seen] = useState(readSeen);
  const [dismissed, setDismissed] = useState(false);
  const [reopened, setReopened] = useState(false);

  // Sample players only ever fill in a preview; the real announcement shows real data or nothing.
  const leaderboard =
    data && (preview ? previewLeaderboard(data.leaderboard, preview.tie) : data.leaderboard);
  const standings = leaderboard ? prizeStandings(leaderboard) : [];
  const winner = standings[0] ?? null;
  const viewer = preview?.as ?? instagram ?? null;

  // Waits for onboarding so a guest who just arrived isn't shown two dialogs at once.
  const autoOpen = preview ? true : ended && !!instagram && !seen;
  const open = !!winner && (reopened || (autoOpen && !dismissed));

  function handleOpenChange(next: boolean) {
    if (next) return;
    setDismissed(true);
    setReopened(false);
    if (!preview) markSeen();
  }

  if (!leaderboard || (!ended && !preview)) return null;

  return (
    <>
      <WinnerBanner winner={winner} onShowWinner={() => setReopened(true)} />
      <Dialog open={open} onOpenChange={handleOpenChange}>
        {open && <Announcement standings={standings} viewer={viewer} showTiebreak={!!preview} />}
      </Dialog>
    </>
  );
}

function Announcement({
  standings,
  viewer,
  showTiebreak,
}: {
  /** Prize order, winner first. Never empty. */
  standings: LeaderboardEntry[];
  viewer: string | null;
  showTiebreak: boolean;
}) {
  const [winner, ...rest] = standings;
  const isWinner = viewer === winner.instagram;
  const position = viewer ? standings.findIndex((e) => e.instagram === viewer) + 1 : 0;
  const me = position > 0 ? standings[position - 1] : undefined;

  useEffect(() => celebrate({ intense: isWinner }), [isWinner]);

  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-zinc-950" />
      <DialogPrimitive.Content className="fixed inset-0 z-50 overflow-y-auto overscroll-contain bg-[radial-gradient(ellipse_at_top,rgba(251,191,36,0.22),transparent_65%)] outline-none data-open:animate-in data-open:fade-in-0 data-open:duration-300 motion-reduce:animate-none">
        <DialogClose asChild>
          <Button
            variant="ghost"
            size="icon-lg"
            aria-label="Cerrar"
            className="fixed right-[max(0.75rem,env(safe-area-inset-right))] top-[max(0.75rem,env(safe-area-inset-top))] z-10 size-11 rounded-full bg-zinc-900/70 text-zinc-300 hover:text-zinc-50"
          >
            <XIcon className="size-5" />
          </Button>
        </DialogClose>

        <div className="mx-auto flex min-h-full w-full max-w-md flex-col items-center justify-center gap-4 px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-[max(3rem,env(safe-area-inset-top))] text-center sm:max-w-2xl lg:max-w-4xl">
          {isWinner ? (
            <PersonalWin handle={winner.instagram} />
          ) : (
            <header className={ENTER}>
              <p className="font-marker text-lg text-amber-300 lg:text-2xl">🏆 Se terminó el juego</p>
              <DialogTitle className="mt-1 text-balance font-display text-5xl uppercase leading-none tracking-wide text-zinc-50 lg:text-6xl">
                ¡Tenemos ganador!
              </DialogTitle>
              <DialogDescription className="sr-only">Resultado final del juego.</DialogDescription>
            </header>
          )}

          <Winner entry={winner} />

          {showTiebreak && rest[0]?.score === winner.score && (
            <TiebreakNote winner={winner} runnerUp={rest[0]} />
          )}

          {rest.length > 0 && <Podium entries={rest.slice(0, 2)} />}

          <footer className={cn(ENTER, "flex w-full flex-col items-center gap-3 delay-700")}>
            {!isWinner && (
              <p className="text-balance text-sm text-zinc-400 lg:text-base">
                {viewer && isExcludedFromPrize(viewer) ? (
                  "Quedaste fuera del premio por ser el cumpleañero 😄"
                ) : (
                  <>
                    {me && me.score > 0 && (
                      <>
                        Terminaste <span className="font-semibold text-zinc-100">{position}°</span> con{" "}
                        <span className="font-semibold text-zinc-100">
                          {me.score} {me.score === 1 ? "pt" : "pts"}
                        </span>
                        .{" "}
                      </>
                    )}
                    ¡Gracias por jugar!
                  </>
                )}
              </p>
            )}
            <DialogClose asChild>
              <Button
                size="lg"
                className="h-11 w-full max-w-xs bg-amber-400 text-base font-semibold text-zinc-950 hover:bg-amber-300"
              >
                Seguir en la fiesta 🎉
              </Button>
            </DialogClose>
          </footer>
        </div>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

/** Only for the winner: it talks to them, so it gets the gold glow. */
function PersonalWin({ handle }: { handle: string }) {
  return (
    <div
      className={cn(
        ENTER,
        "w-full rounded-2xl bg-amber-400/10 px-4 py-5 ring-2 ring-amber-400 shadow-[0_0_48px_rgba(251,191,36,0.45)] lg:py-8"
      )}
    >
      <DialogTitle className="font-display text-6xl uppercase leading-none tracking-wide text-amber-400 lg:text-7xl">
        ¡Ganaste!
      </DialogTitle>
      <p className="mt-2 break-all font-display text-2xl tracking-wide text-zinc-50 lg:text-4xl">
        @{handle}
      </p>
      <DialogDescription className="mt-3 text-base font-medium text-amber-100 lg:text-xl">
        Andá a reclamarle tu premio a Fran 🏆
      </DialogDescription>
    </div>
  );
}

function Winner({ entry }: { entry: LeaderboardEntry }) {
  return (
    <div className={cn(ENTER, "flex w-full flex-col items-center gap-2 delay-200")}>
      <div className="relative w-[min(16rem,30dvh)] lg:w-[min(22rem,31dvh)]">
        <PhotoThumb
          entry={entry}
          className="rounded-2xl ring-4 ring-amber-400 shadow-[0_0_40px_rgba(251,191,36,0.35)]"
        />
        <span className="absolute -top-3 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-full bg-amber-400 px-2.5 py-1 font-display text-sm tracking-wide text-zinc-950 shadow">
          <Crown className="size-4" /> 1°
        </span>
      </div>
      <p className="w-full break-all font-display text-4xl leading-tight tracking-wide text-amber-300 lg:text-5xl">
        @{entry.instagram}
      </p>
      <p className="text-zinc-300">
        <span className="font-display text-3xl tracking-wide text-zinc-50 lg:text-4xl">{entry.score}</span>{" "}
        pts
      </p>
    </div>
  );
}

/** Preview only: tells the host which tiebreak level separated first from second. */
function TiebreakNote({ winner, runnerUp }: { winner: LeaderboardEntry; runnerUp: LeaderboardEntry }) {
  const level = tiebreakLevel(winner, runnerUp);
  return (
    <p className="w-full rounded-lg border border-dashed border-amber-400/60 px-3 py-2 text-xs text-amber-100 lg:text-sm">
      <span className="font-semibold text-amber-300">Preview · desempate:</span> @{winner.instagram} y @
      {runnerUp.instagram} empataron con {winner.score} pts. Ganó @{winner.instagram} por ({level}){" "}
      {TIEBREAK_LABELS[level]}.
    </p>
  );
}

const MEDALS = [
  { place: 2, ring: "ring-zinc-300", text: "text-zinc-300", step: "h-12 lg:h-16" },
  { place: 3, ring: "ring-orange-400", text: "text-orange-400", step: "h-8 lg:h-11" },
];

/** 2nd and 3rd place, smaller, on podium steps. */
function Podium({ entries }: { entries: LeaderboardEntry[] }) {
  return (
    <ol className={cn(ENTER, "flex w-full items-end justify-center gap-3 delay-500 sm:gap-6")}>
      {entries.map((e, i) => {
        const medal = MEDALS[i];
        return (
          <li key={e.instagram} className="flex w-28 min-w-0 flex-col items-center gap-1 sm:w-36 lg:w-44">
            <PhotoThumb entry={e} className={cn("size-14 rounded-full ring-2 lg:size-20", medal.ring)} />
            <p className="w-full truncate text-sm font-medium text-zinc-100 lg:text-base">@{e.instagram}</p>
            <p className="text-xs text-zinc-400 lg:text-sm">
              <span className="font-display text-base tracking-wide text-zinc-100 lg:text-xl">{e.score}</span> pts
            </p>
            <div
              className={cn(
                "mt-1 flex w-full items-start justify-center rounded-t-lg bg-zinc-800/80 pt-1 font-display text-2xl lg:text-3xl",
                medal.step,
                medal.text
              )}
            >
              {medal.place}°
            </div>
          </li>
        );
      })}
    </ol>
  );
}

/** The player's highest-scoring photo, or a placeholder when there's none (preview samples). */
function PhotoThumb({ entry, className }: { entry: LeaderboardEntry; className?: string }) {
  const photo = entry.topPhoto;
  if (!photo) {
    return (
      <div
        className={cn(
          "flex aspect-square w-full items-center justify-center bg-linear-to-br from-zinc-800 to-zinc-900 text-zinc-500",
          className
        )}
      >
        <Camera className="size-1/4" />
      </div>
    );
  }
  return (
    // Thumbnails are 500×500 Cloudinary crops, posters included for videos.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={photo.thumbnailUrl}
      alt={`La foto con más puntos de @${entry.instagram}`}
      className={cn("aspect-square w-full object-cover", className)}
    />
  );
}
