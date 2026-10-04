"use client";

import { Heart, Play, Trophy } from "lucide-react";
import type { Photo } from "@/lib/types";
import { cn } from "@/lib/utils";
import {
  ChallengeLabel,
  InstagramLink,
  InvalidatedBadge,
  PointsChip,
} from "@/components/photo-meta";

export function PhotoCard({
  photo,
  rank,
  isMine,
  onOpen,
  onLike,
}: {
  photo: Photo;
  rank?: number;
  isMine: boolean;
  onOpen: () => void;
  onLike: () => void;
}) {
  const isMostLiked = rank === 1 && photo.likeCount > 0;
  const alt = `Foto de @${photo.instagram}`;

  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-lg bg-zinc-900 ring-1 ring-zinc-800",
        isMostLiked && "ring-2 ring-amber-400",
        photo.invalidated && "ring-2 ring-rose-600"
      )}
    >
      {isMostLiked && (
        <div className="absolute left-2 top-2 z-10 flex items-center gap-1 rounded-full bg-amber-400 px-2 py-1 font-marker text-xs text-zinc-950">
          <Trophy className="size-3.5" />
          Más likeada
        </div>
      )}
      <PointsChip photo={photo} className="absolute right-2 top-2 z-10 shadow" />
      {photo.invalidated && (
        <InvalidatedBadge className="absolute inset-x-2 top-10 z-10 justify-center text-center shadow" />
      )}

      <button
        onClick={onOpen}
        aria-label={photo.type === "VIDEO" ? `Video de @${photo.instagram}` : undefined}
        className="relative block w-full transition-opacity active:opacity-80"
      >
        {/* Thumbnails are 500×500 crops (posters included for videos): the square is reserved
            before they load, so nothing jumps and lazy loading only fetches what's on screen.
            Videos show just their poster here; the lightbox plays them, so the feed never
            downloads video. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={photo.thumbnailUrl}
          alt={photo.type === "VIDEO" ? "" : alt}
          width={500}
          height={500}
          loading="lazy"
          decoding="async"
          className={cn("aspect-square w-full object-cover", photo.invalidated && "opacity-50 grayscale")}
        />
        {photo.type === "VIDEO" && (
          <span className="absolute inset-0 flex items-center justify-center" aria-hidden>
            <span className="flex size-11 items-center justify-center rounded-full bg-black/55 text-white">
              <Play className="ml-0.5 size-5 fill-current" />
            </span>
          </span>
        )}
      </button>

      <div className="space-y-1.5 p-2.5">
        <ChallengeLabel photo={photo} className="line-clamp-2" />
        <div className="flex items-center justify-between gap-2">
          <InstagramLink handle={photo.instagram} className="min-w-0 text-xs" />
          <button
            onClick={(e) => {
              e.stopPropagation();
              onLike();
            }}
            disabled={isMine}
            aria-label={isMine ? "No podés likear tu propia foto" : "Me gusta"}
            aria-pressed={photo.likedByMe}
            // The invisible ::after stretches the touch target to 44px without changing the pill.
            className="relative flex shrink-0 items-center gap-1 rounded-full bg-zinc-800 px-2.5 py-1 text-sm font-medium transition-transform after:absolute after:-inset-x-1 after:-inset-y-2 active:scale-95 disabled:opacity-60 disabled:active:scale-100"
          >
            <Heart
              className={cn(
                "size-4 transition-colors",
                photo.likedByMe ? "fill-rose-500 text-rose-500" : "text-zinc-400"
              )}
            />
            <span className={photo.likedByMe ? "text-rose-500" : "text-zinc-300"}>
              {photo.likeCount}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
