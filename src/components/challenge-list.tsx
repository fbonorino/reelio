"use client";

import { Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BonusTag, FreeBadge, PointsBadge } from "@/components/photo-meta";
import { Skeleton } from "@/components/ui/skeleton";
import { useBonusChallenges, useChallenges } from "@/hooks/use-challenges";
import { useEventStatus } from "@/hooks/use-event-status";
import { FREE_PHOTO, MAX_FREE_PHOTOS_PER_USER } from "@/lib/challenges";
import { BONUS_CONSENT, formatBonusTime } from "@/lib/bonus";
import { cn } from "@/lib/utils";

/**
 * Which kinds of photo the guest still has room for. `bonus` is whether they have bonus photos left
 * (the window being open is checked here); `bonusUsed` the bonus challenges they already did.
 */
export type Pickable = { challenges: boolean; free: boolean; bonus?: boolean; bonusUsed?: string[] };

/**
 * Every challenge, in the host's order, then "Foto libre". Pass `onPick` to show a "Subir esta"
 * button on each one the guest still has room for (`pickable`).
 */
export function ChallengeList({
  onPick,
  pickable = { challenges: true, free: true },
}: {
  onPick?: (challengeId: string) => void;
  pickable?: Pickable;
}) {
  const challenges = useChallenges();
  const bonusChallenges = useBonusChallenges();
  const status = useEventStatus();
  const bonusOpen = status?.phase === "open";
  return (
    <ul className="space-y-2">
      {status?.phase === "before" && (
        <li className="flex items-center gap-2 rounded-lg bg-bonus/10 px-3 py-2.5 text-sm text-zinc-200 ring-1 ring-bonus/40">
          <BonusTag />
          Bonus track a las {formatBonusTime(new Date(status.startsAt))}
        </li>
      )}
      {bonusChallenges?.map((c) => {
        const done = pickable.bonusUsed?.includes(c.id);
        const canPick = bonusOpen && pickable.bonus !== false && !done;
        return (
          <li
            key={c.id}
            className={cn("rounded-lg bg-zinc-950 px-3 py-2.5 ring-1 ring-bonus/50", !bonusOpen && "opacity-50")}
          >
            <div className="flex items-center gap-3">
              <PointsBadge points={c.points} bonus className="w-11 shrink-0 text-center" />
              <div className="min-w-0 flex-1">
                <p className="text-sm leading-snug text-zinc-200">{c.label}</p>
                <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-zinc-400">
                  <BonusTag multiplier={status?.multiplier} />
                  {!bonusOpen ? "Cerrada" : done ? "Ya la subiste" : null}
                </p>
              </div>
            </div>
            {onPick && canPick && (
              <Button
                size="sm"
                onClick={() => onPick(c.id)}
                aria-label={`Subir foto bonus para: ${c.label}`}
                className="mt-2 h-11 w-full bg-bonus text-sm text-white hover:bg-bonus/90"
              >
                <Camera className="size-4" />
                Subir esta
              </Button>
            )}
          </li>
        );
      })}
      {!!bonusChallenges?.length && bonusOpen && (
        <li className="px-1 pb-2 text-center text-xs font-medium text-zinc-400">{BONUS_CONSENT}</li>
      )}
      {!challenges &&
        [0, 1, 2].map((i) => (
          <li key={i}>
            <Skeleton className="h-12 rounded-lg bg-zinc-800" />
          </li>
        ))}
      {challenges?.map((c) => (
        <li key={c.id} className="rounded-lg bg-zinc-950 px-3 py-2.5 ring-1 ring-zinc-800">
          <div className="flex items-center gap-3">
            <PointsBadge points={c.points} className="w-11 shrink-0 text-center" />
            <p className="min-w-0 flex-1 text-sm leading-snug text-zinc-200">
              {c.label}
            </p>
          </div>
          {onPick && pickable.challenges && (
            <Button
              size="sm"
              onClick={() => onPick(c.id)}
              aria-label={`Subir foto para: ${c.label}`}
              className="mt-2 h-11 w-full text-sm bg-indigo-600 text-white hover:bg-indigo-500"
            >
              <Camera className="size-4" />
              Subir esta
            </Button>
          )}
        </li>
      ))}
      <li className="rounded-lg border border-dashed border-zinc-700 bg-zinc-950/40 px-3 py-2.5">
        <div className="flex items-center gap-3">
          <FreeBadge className="w-11 shrink-0 text-center" />
          <div className="min-w-0 flex-1">
            <p className="text-sm leading-snug text-zinc-300">{FREE_PHOTO.label}</p>
            <p className="text-xs leading-snug text-zinc-400">{FREE_PHOTO.hint}</p>
          </div>
        </div>
        {onPick && (
          <Button
            size="sm"
            variant="secondary"
            onClick={() => onPick(FREE_PHOTO.id)}
            disabled={!pickable.free}
            aria-label={
              pickable.free
                ? "Subir una foto libre"
                : `Ya subiste tus ${MAX_FREE_PHOTOS_PER_USER} fotos libres`
            }
            className="mt-2 h-11 w-full text-sm bg-zinc-800 text-zinc-200 hover:bg-zinc-700"
          >
            <Camera className="size-4" />
            {pickable.free ? "Subir una libre" : `Ya subiste tus ${MAX_FREE_PHOTOS_PER_USER} libres`}
          </Button>
        )}
      </li>
    </ul>
  );
}
