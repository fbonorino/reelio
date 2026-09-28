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
  PointsChip,
} from "@/components/photo-meta";
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

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/photos/${id}?key=${encodeURIComponent(key)}`, {
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
    <div className="min-h-screen bg-zinc-950 pb-12">
      <header className="sticky top-0 z-10 border-b border-zinc-800 bg-zinc-950/90 px-4 py-4 backdrop-blur">
        <h1 className="text-lg font-bold text-zinc-50">Panel de host</h1>
        <p className="text-sm text-zinc-500">
          Revisá que cada foto cumpla su consigna. Descontar puntos saca los puntos de la consigna
          (los likes siguen sumando); eliminar borra la foto y le devuelve el cupo.
        </p>
      </header>

      <div className="grid gap-3 p-4 lg:grid-cols-2 lg:items-start">
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
        <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-3 lg:grid-cols-4">
          {photos.map((photo) => (
            <div
              key={photo.id}
              className={cn(
                "flex flex-col overflow-hidden rounded-lg bg-zinc-900 ring-1 ring-zinc-800",
                photo.invalidated && "ring-2 ring-rose-600"
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
              <div className="flex flex-1 flex-col gap-2 p-2 text-xs text-zinc-400">
                <InstagramLink handle={photo.instagram} className="text-xs" />
                <ChallengeLabel photo={photo} />
                {photo.invalidated && <InvalidatedBadge className="self-start" />}
                <span>{photo.likeCount} likes</span>
                <div className="mt-auto flex gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    className="flex-1"
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
                  <Button
                    size="sm"
                    variant="destructive"
                    aria-label="Eliminar"
                    disabled={deletingId === photo.id}
                    onClick={() => handleDelete(photo.id)}
                  >
                    {deletingId === photo.id ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Trash2 className="size-4" />
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
