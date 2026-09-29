import { Ban, Camera } from "lucide-react";
import { getChallenge } from "@/lib/challenges";
import { instagramUrl } from "@/lib/instagram";
import { cn } from "@/lib/utils";
import type { Photo } from "@/lib/types";

export function InstagramLink({ handle, className }: { handle: string; className?: string }) {
  return (
    <a
      href={instagramUrl(handle)}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
      className={cn("truncate font-medium text-indigo-300 hover:underline", className)}
    >
      @{handle}
    </a>
  );
}

export function PointsBadge({
  points,
  struck,
  className,
}: {
  points: number;
  struck?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "rounded-full bg-amber-400 px-2 py-0.5 font-display text-sm tracking-wide text-zinc-950",
        struck && "bg-zinc-700 text-zinc-400 line-through",
        className
      )}
    >
      +{points}
    </span>
  );
}

/** Challenge points, or a "Recuerdo" tag for photos uploaded after the game closed. */
export function PointsChip({ photo, className }: { photo: Photo; className?: string }) {
  if (photo.postDeadline) return <KeepsakeBadge className={className} />;
  return (
    <PointsBadge points={photo.challengePoints} struck={photo.invalidated} className={className} />
  );
}

export function ChallengeLabel({ photo, className }: { photo: Photo; className?: string }) {
  return (
    <p className={cn("text-xs leading-snug text-zinc-400", className)}>
      {getChallenge(photo.challengeId)?.label ?? photo.challengeId}
    </p>
  );
}

export function InvalidatedBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full bg-rose-600 px-2 py-1 text-xs font-semibold text-white",
        className
      )}
    >
      <Ban className="size-3.5" />
      Invalidada — debe 1 shot
    </span>
  );
}

/** Marks a photo uploaded after the game closed: it doesn't count for points or the ranking. */
export function KeepsakeBadge({ label = "Recuerdo", className }: { label?: string; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full bg-sky-500 px-2 py-0.5 text-xs font-semibold text-zinc-950",
        className
      )}
    >
      <Camera className="size-3.5" />
      {label}
    </span>
  );
}
