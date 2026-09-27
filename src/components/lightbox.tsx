"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Heart, X } from "lucide-react";
import type { Photo } from "@/lib/types";
import { cn } from "@/lib/utils";
import {
  ChallengeLabel,
  InstagramLink,
  InvalidatedBadge,
  PointsChip,
} from "@/components/photo-meta";

export function Lightbox({
  photos,
  index,
  myInstagram,
  onClose,
  onIndexChange,
  onLike,
}: {
  photos: Photo[];
  index: number;
  myInstagram: string | null | undefined;
  onClose: () => void;
  onIndexChange: (index: number) => void;
  onLike: (photoId: string) => void;
}) {
  const touchStartX = useRef<number | null>(null);
  const [dragOffset, setDragOffset] = useState(0);
  const photo = photos[index];

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") goTo(index - 1);
      if (e.key === "ArrowRight") goTo(index + 1);
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  function goTo(newIndex: number) {
    if (newIndex < 0 || newIndex >= photos.length) return;
    onIndexChange(newIndex);
  }

  function handleTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX;
  }

  function handleTouchMove(e: React.TouchEvent) {
    if (touchStartX.current === null) return;
    setDragOffset(e.touches[0].clientX - touchStartX.current);
  }

  function handleTouchEnd() {
    if (Math.abs(dragOffset) > 60) {
      goTo(dragOffset > 0 ? index - 1 : index + 1);
    }
    setDragOffset(0);
    touchStartX.current = null;
  }

  if (!photo) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/95">
      <div className="flex items-start justify-between gap-3 p-4">
        <div className="min-w-0 space-y-1">
          <div className="flex items-center gap-2">
            <InstagramLink handle={photo.instagram} className="text-sm" />
            <PointsChip photo={photo} />
          </div>
          <ChallengeLabel photo={photo} className="text-sm" />
          {photo.invalidated && <InvalidatedBadge />}
        </div>
        <button onClick={onClose} aria-label="Cerrar" className="shrink-0 rounded-full p-1 text-zinc-300">
          <X className="size-6" />
        </button>
      </div>

      <div
        className="relative flex flex-1 items-center justify-center overflow-hidden touch-pan-y"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {index > 0 && (
          <button
            onClick={() => goTo(index - 1)}
            className="absolute left-2 z-10 hidden rounded-full bg-black/50 p-2 text-white sm:block"
          >
            <ChevronLeft className="size-6" />
          </button>
        )}
        {index < photos.length - 1 && (
          <button
            onClick={() => goTo(index + 1)}
            className="absolute right-2 z-10 hidden rounded-full bg-black/50 p-2 text-white sm:block"
          >
            <ChevronRight className="size-6" />
          </button>
        )}

        {photo.type === "VIDEO" ? (
          <video
            key={photo.id}
            src={photo.url}
            className="max-h-full max-w-full"
            controls
            autoPlay
            playsInline
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={photo.id}
            src={photo.url}
            alt={`Foto de @${photo.instagram}`}
            className="max-h-full max-w-full object-contain"
          />
        )}
      </div>

      <div className="flex items-center justify-center gap-2 p-5">
        <button
          onClick={() => onLike(photo.id)}
          disabled={photo.instagram === myInstagram}
          className="flex items-center gap-2 rounded-full bg-zinc-800 px-4 py-2 text-base font-medium disabled:opacity-60"
        >
          <Heart
            className={cn(
              "size-5",
              photo.likedByMe ? "fill-rose-500 text-rose-500" : "text-zinc-300"
            )}
          />
          <span className={photo.likedByMe ? "text-rose-500" : "text-zinc-200"}>
            {photo.likeCount}
          </span>
        </button>
      </div>
    </div>
  );
}
