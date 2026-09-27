"use client";

import { useState } from "react";
import { toast } from "sonner";
import { ImageOff } from "lucide-react";
import { usePhotos } from "@/hooks/use-photos";
import { getDeviceId } from "@/lib/device-id";
import { useInstagram } from "@/lib/profile";
import { PhotoCard } from "@/components/photo-card";
import { Lightbox } from "@/components/lightbox";
import { Skeleton } from "@/components/ui/skeleton";
import type { Photo } from "@/lib/types";

export function Feed({ sort }: { sort: "new" | "top" }) {
  const [deviceId] = useState(() => getDeviceId());
  const myInstagram = useInstagram();

  const { photos, isLoading, mutate } = usePhotos(sort, deviceId);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  async function toggleLike(photoId: string) {
    const target = photos.find((p) => p.id === photoId);
    if (!target || !deviceId || target.instagram === myInstagram) return;

    const optimistic: Photo[] = photos.map((p) =>
      p.id === photoId
        ? {
            ...p,
            likedByMe: !p.likedByMe,
            likeCount: p.likeCount + (p.likedByMe ? -1 : 1),
          }
        : p
    );

    mutate({ photos: optimistic }, false);

    try {
      const res = await fetch("/api/likes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photoId, deviceId, instagram: myInstagram }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
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
      <div className="columns-2 gap-3 p-3 sm:columns-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="mb-3 h-48 w-full break-inside-avoid rounded-lg bg-zinc-900" />
        ))}
      </div>
    );
  }

  if (photos.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 py-24 text-center text-zinc-500">
        <ImageOff className="size-10" />
        <p className="text-base font-medium text-zinc-300">¡Todavía nadie sumó puntos!</p>
        <p className="text-sm">Tocá &ldquo;Subir consigna&rdquo; abajo y arrancá vos.</p>
      </div>
    );
  }

  return (
    <>
      <div className="columns-2 gap-3 p-3 pb-28 sm:columns-3">
        {photos.map((photo, i) => (
          <PhotoCard
            key={photo.id}
            photo={photo}
            rank={sort === "top" ? i + 1 : undefined}
            isMine={photo.instagram === myInstagram}
            onOpen={() => setLightboxIndex(i)}
            onLike={() => toggleLike(photo.id)}
          />
        ))}
      </div>

      {lightboxIndex !== null && (
        <Lightbox
          photos={photos}
          index={lightboxIndex}
          myInstagram={myInstagram}
          onClose={() => setLightboxIndex(null)}
          onIndexChange={setLightboxIndex}
          onLike={toggleLike}
        />
      )}
    </>
  );
}
