"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import useSWR from "swr";
import { toast } from "sonner";
import { Loader2, MinusCircle, RotateCcw, ShieldAlert, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HostExport } from "@/components/host-export";
import { HostGuests } from "@/components/host-guests";
import {
  ChallengeLabel,
  InstagramLink,
  InvalidatedBadge,
  KeepsakeBadge,
  PointsChip,
} from "@/components/photo-meta";
import { isFreePhoto } from "@/lib/challenges";
import type { Photo } from "@/lib/types";
import { cn } from "@/lib/utils";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function HostPage() {
  return (
    <Suspense fallback={null}>
      <HostView />
    </Suspense>
  );
}

function HostView() {
  const searchParams = useSearchParams();
  const key = searchParams.get("key") ?? "";
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const { data, mutate, isLoading } = useSWR<{ photos: Photo[] }>(
    key ? "/api/photos" : null,
    fetcher,
    { refreshInterval: 5000 }
  );

  async function handleDelete(photo: Photo) {
    if (!confirm(`¿Eliminar la foto de @${photo.instagram}? Se borra para siempre y le devuelve el cupo.`)) {
      return;
    }
    setDeletingId(photo.id);
    try {
      const res = await fetch(`/api/photos/${photo.id}?key=${encodeURIComponent(key)}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error();
      toast.success("Foto eliminada");
      mutate();
    } catch {
      toast.error("No se pudo eliminar — revisá la host key");
    } finally {
      setDeletingId(null);
    }
  }

  async function handleToggleInvalidated(photo: Photo) {
    setTogglingId(photo.id);
    try {
      const res = await fetch(`/api/photos/${photo.id}?key=${encodeURIComponent(key)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invalidated: !photo.invalidated }),
      });
      if (!res.ok) throw new Error();
      toast.success(
        photo.invalidated
          ? `Puntos devueltos a @${photo.instagram}`
          : `-${photo.challengePoints} pts a @${photo.instagram} — debe 1 shot 🍻`
      );
      mutate();
    } catch {
      toast.error("No se pudo actualizar — revisá la host key");
    } finally {
      setTogglingId(null);
    }
  }

  if (!key) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-zinc-950 px-6 text-center text-zinc-400">
        <ShieldAlert className="size-10" />
        <p>Agregá <code className="rounded bg-zinc-900 px-1.5 py-0.5">?key=YOUR_HOST_SECRET</code> a la URL.</p>
      </div>
    );
  }

  const photos = data?.photos ?? [];

  return (
    <div className="min-h-screen overflow-x-clip bg-zinc-950 pb-[calc(3rem+env(safe-area-inset-bottom))]">
      {/* On phones the long description would eat a third of the screen if sticky, so it only sticks from sm up. */}
      <header className="z-10 border-b border-zinc-800 bg-zinc-950/90 px-4 pb-4 pt-[max(1rem,env(safe-area-inset-top))] backdrop-blur sm:sticky sm:top-0">
        <h1 className="text-lg font-bold text-zinc-50">Panel de host</h1>
        <p className="text-sm text-zinc-500">
          Revisá que cada foto cumpla su consigna. Descontar puntos saca los puntos de la consigna
          (los likes siguen sumando); eliminar borra la foto y le devuelve el cupo.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-3 p-4 lg:grid-cols-2 lg:items-start">
        <HostGuests hostKey={key} />
        <HostExport hostKey={key} />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16 text-zinc-500">
          <Loader2 className="size-6 animate-spin" />
        </div>
      ) : photos.length === 0 ? (
        <p className="px-4 py-16 text-center text-zinc-500">Todavía no hay fotos.</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-3 sm:gap-3 lg:grid-cols-4">
          {photos.map((photo) => (
            <div
              key={photo.id}
              className={cn(
                "flex min-w-0 flex-col overflow-hidden rounded-lg bg-zinc-900 ring-1 ring-zinc-800",
                photo.invalidated && "ring-2 ring-rose-600",
                photo.postDeadline && "ring-sky-700"
              )}
            >
              <a href={photo.url} target="_blank" rel="noopener noreferrer" className="relative block">
                {photo.type === "VIDEO" ? (
                  <video src={photo.url} poster={photo.thumbnailUrl} className="aspect-square w-full object-cover" muted />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={photo.thumbnailUrl} alt="" className="aspect-square w-full object-cover" />
                )}
                <PointsChip photo={photo} className="absolute right-2 top-2" />
              </a>
              <div className="flex min-w-0 flex-1 flex-col gap-2 p-3 text-sm text-zinc-400 sm:p-2 sm:text-xs">
                <InstagramLink
                  handle={photo.instagram}
                  className="-my-3 max-w-full self-start py-3 text-sm sm:my-0 sm:self-auto sm:py-0 sm:text-xs"
                />
                <ChallengeLabel photo={photo} className="text-sm leading-snug sm:text-xs" />
                {photo.invalidated && <InvalidatedBadge className="self-start" />}
                {photo.postDeadline && (
                  <KeepsakeBadge label="Post-cierre · no suma puntos" className="self-start" />
                )}
                <span>{photo.likeCount} likes</span>
                {/* Wide gap on phones so a thumb aimed at Descontar never lands on Eliminar. */}
                <div className="mt-auto flex flex-wrap gap-4 pt-1 sm:flex-nowrap sm:gap-2 sm:pt-0">
                  {/* Post-deadline and free photos score nothing, so there's nothing to take away. */}
                  {!photo.postDeadline && !isFreePhoto(photo.challengeId) && (
                    <Button
                      size="sm"
                      variant="secondary"
                      className="h-11 min-w-36 flex-1 text-sm sm:h-7 sm:min-w-0 sm:text-[0.8rem]"
                      disabled={togglingId === photo.id}
                      onClick={() => handleToggleInvalidated(photo)}
                    >
                      {togglingId === photo.id ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : photo.invalidated ? (
                        <>
                          <RotateCcw className="size-4" />
                          Restaurar
                        </>
                      ) : (
                        <>
                          <MinusCircle className="size-4" />
                          Descontar puntos
                        </>
                      )}
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="destructive"
                    aria-label="Eliminar"
                    className="h-11 px-4 text-sm sm:h-7 sm:px-2.5 sm:text-[0.8rem]"
                    disabled={deletingId === photo.id}
                    onClick={() => handleDelete(photo)}
                  >
                    {deletingId === photo.id ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <>
                        <Trash2 className="size-4" />
                        <span className="sm:hidden">Eliminar</span>
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
