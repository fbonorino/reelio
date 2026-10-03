import { Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FreeBadge, PointsBadge } from "@/components/photo-meta";
import { CHALLENGES_BY_POINTS, FREE_PHOTO, MAX_FREE_PHOTOS_PER_USER } from "@/lib/challenges";

/** Which kinds of photo the guest still has room for. */
export type Pickable = { challenges: boolean; free: boolean };

/**
 * Every challenge, most points first, then "Foto libre". Pass `onPick` to show a "Subir esta"
 * button on each one the guest still has room for (`pickable`).
 */
export function ChallengeList({
  onPick,
  pickable = { challenges: true, free: true },
}: {
  onPick?: (challengeId: string) => void;
  pickable?: Pickable;
}) {
  return (
    <ul className="space-y-2">
      {CHALLENGES_BY_POINTS.map((c) => (
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
              className="mt-2 w-full bg-indigo-600 hover:bg-indigo-500"
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
            <p className="text-xs leading-snug text-zinc-500">{FREE_PHOTO.hint}</p>
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
            className="mt-2 w-full bg-zinc-800 text-zinc-200 hover:bg-zinc-700"
          >
            <Camera className="size-4" />
            {pickable.free ? "Subir una libre" : `Ya subiste tus ${MAX_FREE_PHOTOS_PER_USER} libres`}
          </Button>
        )}
      </li>
    </ul>
  );
}
