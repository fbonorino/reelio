"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import useSWR from "swr";
import { toast } from "sonner";
import { Loader2, ShieldAlert, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Photo } from "@/lib/types";

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
      toast.success("Photo removed");
      mutate();
    } catch {
      toast.error("Failed to delete — check your host key");
    } finally {
      setDeletingId(null);
    }
  }

  if (!key) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-zinc-950 px-6 text-center text-zinc-400">
        <ShieldAlert className="size-10" />
        <p>Add <code className="rounded bg-zinc-900 px-1.5 py-0.5">?key=YOUR_HOST_SECRET</code> to the URL.</p>
      </div>
    );
  }

  const photos = data?.photos ?? [];

  return (
    <div className="min-h-screen bg-zinc-950 pb-12">
      <header className="sticky top-0 z-10 border-b border-zinc-800 bg-zinc-950/90 px-4 py-4 backdrop-blur">
        <h1 className="text-lg font-bold text-zinc-50">Host controls</h1>
        <p className="text-sm text-zinc-500">Remove inappropriate or duplicate uploads.</p>
      </header>

      {isLoading ? (
        <div className="flex justify-center py-16 text-zinc-500">
          <Loader2 className="size-6 animate-spin" />
        </div>
      ) : photos.length === 0 ? (
        <p className="px-4 py-16 text-center text-zinc-500">No photos yet.</p>
      ) : (
        <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-4">
          {photos.map((photo) => (
            <div key={photo.id} className="overflow-hidden rounded-lg bg-zinc-900 ring-1 ring-zinc-800">
              {photo.type === "VIDEO" ? (
                <video src={photo.url} poster={photo.thumbnailUrl} className="aspect-square w-full object-cover" muted />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={photo.thumbnailUrl} alt="" className="aspect-square w-full object-cover" />
              )}
              <div className="flex items-center justify-between p-2 text-xs text-zinc-400">
                <span>{photo.likeCount} likes</span>
                <Button
                  size="sm"
                  variant="destructive"
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
          ))}
        </div>
      )}
    </div>
  );
}
