import { Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PointsBadge } from "@/components/photo-meta";
import { CHALLENGES } from "@/lib/challenges";

const BY_POINTS = [...CHALLENGES].sort((a, b) => b.points - a.points);

/** Every challenge, most points first. Pass `onPick` to show a "Subir esta" button on each. */
export function ChallengeList({ onPick }: { onPick?: (challengeId: string) => void }) {
  return (
    <ul className="space-y-2">
      {BY_POINTS.map((c) => (
        <li key={c.id} className="rounded-lg bg-zinc-950 px-3 py-2.5 ring-1 ring-zinc-800">
          <div className="flex items-center gap-3">
            <PointsBadge points={c.points} className="w-11 shrink-0 text-center" />
            <p className="min-w-0 flex-1 text-sm leading-snug text-zinc-200">
              {c.label}
            </p>
          </div>
          {onPick && (
            <Button
              size="sm"
              onClick={() => onPick(c.id)}
              className="mt-2 w-full bg-indigo-600 hover:bg-indigo-500"
            >
              <Camera className="size-4" />
              Subir esta
            </Button>
          )}
        </li>
      ))}
    </ul>
  );
}
