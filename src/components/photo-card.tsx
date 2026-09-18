"use client";

import { Heart, Trophy } from "lucide-react";
import type { Photo } from "@/lib/types";
import { cn } from "@/lib/utils";

export function PhotoCard({
  photo,
  rank,
  onOpen,
  onLike,
}: {
  photo: Photo;
  rank?: number;
  onOpen: () => void;
  onLike: () => void;
}) {
  const isWinner = rank === 1 && photo.likeCount > 0;

  return (
    <div
      className={cn(
        "group relative mb-3 break-inside-avoid overflow-hidden rounded-lg bg-zinc-900 ring-1 ring-zinc-800",
        isWinner && "ring-2 ring-amber-400"
      )}
    >
      {isWinner && (
        <div className="absolute left-2 top-2 z-10 flex items-center gap-1 rounded-full bg-amber-400 px-2 py-1 text-xs font-bold text-zinc-950">
          <Trophy className="size-3.5" />
          Winning
        </div>
      )}

      <button onClick={onOpen} className="block w-full">
        {photo.type === "VIDEO" ? (
          <video
            src={photo.url}
            poster={photo.thumbnailUrl}
            className="w-full object-cover"
            muted
            playsInline
            preload="metadata"
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={photo.thumbnailUrl}
            alt={photo.uploaderName ? `Photo by ${photo.uploaderName}` : "Party photo"}
            loading="lazy"
            className="w-full object-cover"
          />
        )}
      </button>

      <div className="flex items-center justify-between gap-2 p-2.5">
        <span className="truncate text-xs text-zinc-400">
          {photo.uploaderName || "Anonymous"}
        </span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onLike();
          }}
          className="flex shrink-0 items-center gap-1 rounded-full bg-zinc-800 px-2.5 py-1 text-sm font-medium transition-colors active:scale-95"
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
  );
}
