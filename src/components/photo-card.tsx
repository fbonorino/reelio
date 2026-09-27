"use client";

import { Heart, Trophy } from "lucide-react";
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
        "group relative mb-3 break-inside-avoid overflow-hidden rounded-lg bg-zinc-900 ring-1 ring-zinc-800",
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

      <button onClick={onOpen} className="block w-full">
        {photo.type === "VIDEO" ? (
          <video
            src={photo.url}
            poster={photo.thumbnailUrl}
            className={cn("w-full object-cover", photo.invalidated && "opacity-50 grayscale")}
            muted
            playsInline
            preload="metadata"
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={photo.thumbnailUrl}
            alt={alt}
            loading="lazy"
            className={cn("w-full object-cover", photo.invalidated && "opacity-50 grayscale")}
          />
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
            className="flex shrink-0 items-center gap-1 rounded-full bg-zinc-800 px-2.5 py-1 text-sm font-medium transition-colors active:scale-95 disabled:opacity-60 disabled:active:scale-100"
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
