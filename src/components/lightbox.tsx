"use client";

import { useEffect, useRef, useState } from "react";
import { Dialog as DialogPrimitive } from "radix-ui";
import { ChevronLeft, ChevronRight, Heart, X } from "lucide-react";
import type { Photo } from "@/lib/types";
import { cn } from "@/lib/utils";
import { fullScreenImageUrl, videoPosterUrl } from "@/lib/cloudinary-client";
import { useBackToClose } from "@/hooks/use-back-to-close";
import {
  ChallengeLabel,
  InstagramLink,
  InvalidatedBadge,
  PointsChip,
} from "@/components/photo-meta";

/**
 * Full-screen viewer. Follows the photo by id, so new uploads or like changes reordering the
 * feed underneath never swap what's on screen. A modal dialog: it locks the page's scroll
 * (iOS included), traps focus, and closes on Escape or the phone's Back.
 */
export function Lightbox({
  photos,
  photoId,
  myInstagram,
  onClose,
  onPhotoChange,
  onLike,
}: {
  photos: Photo[];
  photoId: string;
  myInstagram: string | null | undefined;
  onClose: () => void;
  onPhotoChange: (photoId: string) => void;
  onLike: (photoId: string) => void;
}) {
  const touchStartX = useRef<number | null>(null);
  const [dragOffset, setDragOffset] = useState(0);
  const index = photos.findIndex((p) => p.id === photoId);
  const photo = photos[index];
  const next = photos[index + 1];

  useBackToClose(true, onClose);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "ArrowLeft") goTo(index - 1);
      if (e.key === "ArrowRight") goTo(index + 1);
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  // Warm up the next photo so a swipe shows it right away on a slow connection.
  useEffect(() => {
    if (next?.type === "IMAGE") new Image().src = fullScreenImageUrl(next.url);
  }, [next]);

  // Deleted by the host while open.
  useEffect(() => {
    if (index === -1) onClose();
  }, [index, onClose]);

  function goTo(newIndex: number) {
    if (newIndex < 0 || newIndex >= photos.length) return;
    onPhotoChange(photos[newIndex].id);
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

  const mediaStyle = {
    transform: dragOffset ? `translateX(${dragOffset}px)` : undefined,
  };

  return (
    <DialogPrimitive.Root open onOpenChange={(open) => !open && onClose()}>
      <DialogPrimitive.Portal>
        {/* Radix locks the page's scroll from the overlay, so it's needed even though the content covers it. */}
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/95" />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          className="fixed inset-0 z-50 flex flex-col pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)] outline-none"
        >
          <div className="flex items-start justify-between gap-3 px-4 pb-2 pt-[max(1rem,env(safe-area-inset-top))]">
            <div className="min-w-0 space-y-1">
              <div className="flex items-center gap-2">
                <InstagramLink handle={photo.instagram} className="text-sm" />
                <PointsChip photo={photo} />
              </div>
              <DialogPrimitive.Title asChild>
                <div>
                  <ChallengeLabel photo={photo} className="text-sm" />
                </div>
              </DialogPrimitive.Title>
              {photo.invalidated && <InvalidatedBadge />}
            </div>
            <DialogPrimitive.Close
              aria-label="Cerrar"
              className="-mr-2 -mt-2 flex size-11 shrink-0 items-center justify-center rounded-full text-zinc-300 active:bg-zinc-800"
            >
              <X className="size-6" />
            </DialogPrimitive.Close>
          </div>

          <div
            className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden touch-pan-y"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onTouchCancel={handleTouchEnd}
          >
            {index > 0 && (
              <button
                onClick={() => goTo(index - 1)}
                aria-label="Foto anterior"
                className="absolute left-2 z-10 hidden rounded-full bg-black/50 p-2.5 text-white sm:block"
              >
                <ChevronLeft className="size-6" />
              </button>
            )}
            {index < photos.length - 1 && (
              <button
                onClick={() => goTo(index + 1)}
                aria-label="Foto siguiente"
                className="absolute right-2 z-10 hidden rounded-full bg-black/50 p-2.5 text-white sm:block"
              >
                <ChevronRight className="size-6" />
              </button>
            )}

            {photo.type === "VIDEO" ? (
              <video
                key={photo.id}
                src={photo.url}
                poster={videoPosterUrl(photo.url)}
                className="max-h-full max-w-full"
                style={mediaStyle}
                controls
                autoPlay
                playsInline
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={photo.id}
                src={fullScreenImageUrl(photo.url)}
                alt={`Foto de @${photo.instagram}`}
                decoding="async"
                className="max-h-full max-w-full object-contain"
                style={mediaStyle}
              />
            )}
          </div>

          <div className="flex items-center justify-center gap-2 px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-3">
            <button
              onClick={() => onLike(photo.id)}
              disabled={photo.instagram === myInstagram}
              aria-label={photo.instagram === myInstagram ? "No podés likear tu propia foto" : "Me gusta"}
              aria-pressed={photo.likedByMe}
              className="flex h-11 items-center gap-2 rounded-full bg-zinc-800 px-5 text-base font-medium transition-transform active:scale-95 disabled:opacity-60 disabled:active:scale-100"
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
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
