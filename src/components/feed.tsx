"use client";

import { useState } from "react";
import { toast } from "sonner";
import { ImageOff } from "lucide-react";
import { usePhotos } from "@/hooks/use-photos";
import { getDeviceId } from "@/lib/device-id";
import { PhotoCard } from "@/components/photo-card";
import { Lightbox } from "@/components/lightbox";
import { Skeleton } from "@/components/ui/skeleton";
import type { Photo } from "@/lib/types";

export function Feed({ sort }: { sort: "new" | "top" }) {
  const [deviceId] = useState(() => getDeviceId());

  const { photos, isLoading, mutate } = usePhotos(sort, deviceId);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  async function toggleLike(photoId: string) {
    const target = photos.find((p) => p.id === photoId);
    if (!target || !deviceId) return;

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
        body: JSON.stringify({ photoId, deviceId }),
      });
      if (!res.ok) throw new Error();
      mutate();
    } catch {
      toast.error("Couldn't save your like, try again");
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
        <p className="text-base font-medium text-zinc-300">Be the first to share a moment!</p>
        <p className="text-sm">Tap &ldquo;Share a moment&rdquo; below to upload a photo or video.</p>
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
            onOpen={() => setLightboxIndex(i)}
            onLike={() => toggleLike(photo.id)}
          />
        ))}
      </div>

      {lightboxIndex !== null && (
        <Lightbox
          photos={photos}
          index={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onIndexChange={setLightboxIndex}
          onLike={toggleLike}
        />
      )}
    </>
  );
}
