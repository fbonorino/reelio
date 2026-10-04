"use client";

import { useState } from "react";
import { toast } from "sonner";
import { ImageOff } from "lucide-react";
import { usePhotos } from "@/hooks/use-photos";
import { useEventEnded } from "@/hooks/use-event-ended";
import { forgetIfNotInvited, useInstagram } from "@/lib/profile";
import { PhotoCard } from "@/components/photo-card";
import { Lightbox } from "@/components/lightbox";
import { Skeleton } from "@/components/ui/skeleton";
import { isFreePhoto } from "@/lib/challenges";
import type { Photo } from "@/lib/types";

export function Feed({ sort }: { sort: "new" | "top" }) {
  const myInstagram = useInstagram();

  const { photos, isLoading, mutate } = usePhotos(sort, myInstagram);
  // By id, not position: the list reorders under the open lightbox as photos and likes come in.
  const [lightboxId, setLightboxId] = useState<string | null>(null);
  const ended = useEventEnded();

  async function toggleLike(photoId: string) {
    const target = photos.find((p) => p.id === photoId);
    if (!target || !myInstagram || target.instagram === myInstagram) return;
    // The ranking is frozen, so game photos' likes are too. Keepsakes and free photos can still be liked.
    if (ended && !target.postDeadline && !isFreePhoto(target.challengeId)) {
      toast.error("El juego ya terminó: los likes de las fotos del juego quedaron congelados");
      return;
    }
    const unliking = target.likedByMe;

    const optimistic: Photo[] = photos.map((p) =>
      p.id === photoId
        ? {
            ...p,
            likedByMe: !unliking,
            likeCount: p.likeCount + (unliking ? -1 : 1),
          }
        : p
    );

    mutate({ photos: optimistic }, false);

    try {
      const res = await fetch("/api/likes", {
        method: unliking ? "DELETE" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photoId, instagram: myInstagram }),
      });
      // 409: this handle already liked it (e.g. from another tab) — the refetch below shows that.
      if (!res.ok && res.status !== 409) {
        const data = await res.json().catch(() => null);
        forgetIfNotInvited(data);
        throw new Error(data?.error);
      }
      mutate();
    } catch (err) {
      toast.error(
        err instanceof Error && err.message ? err.message : "No se pudo guardar el like, probá de nuevo"
      );
      mutate();
    }
  }

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-3 p-3 sm:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="aspect-[4/5] w-full rounded-lg bg-zinc-900" />
        ))}
      </div>
    );
  }

  if (photos.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 py-24 text-center text-zinc-400">
        <ImageOff className="size-10" />
        <p className="text-base font-medium text-zinc-300">¡Todavía nadie sumó puntos!</p>
        <p className="text-sm">Tocá &ldquo;Subir consigna&rdquo; abajo y arrancá vos.</p>
      </div>
    );
  }

  return (
    <>
      {/* A grid, not CSS columns: thumbnails are all square, and it reads in order left to right,
          so "Más likeadas" goes 1, 2 / 3, 4 instead of filling one column before the next. */}
      <div className="grid grid-cols-2 items-start gap-3 p-3 pb-[calc(7rem+env(safe-area-inset-bottom))] sm:grid-cols-3">
        {photos.map((photo, i) => (
          <PhotoCard
            key={photo.id}
            photo={photo}
            rank={sort === "top" ? i + 1 : undefined}
            isMine={photo.instagram === myInstagram}
            onOpen={() => setLightboxId(photo.id)}
            onLike={() => toggleLike(photo.id)}
          />
        ))}
      </div>

      {lightboxId !== null && (
        <Lightbox
          photos={photos}
          photoId={lightboxId}
          myInstagram={myInstagram}
          onClose={() => setLightboxId(null)}
          onPhotoChange={setLightboxId}
          onLike={toggleLike}
        />
      )}
    </>
  );
}
