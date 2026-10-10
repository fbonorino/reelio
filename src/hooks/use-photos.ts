"use client";

import useSWR from "swr";
import type { Photo } from "@/lib/types";
import { useFeedRefreshInterval } from "@/hooks/use-upload-activity";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

/** `instagram` is the viewer's handle, used by the server to fill in `likedByMe`. */
export function usePhotos(sort: "new" | "top", instagram: string | null | undefined) {
  // Every 10 s, not while this device uploads, and never in a hidden tab.
  const refreshInterval = useFeedRefreshInterval();
  const params = new URLSearchParams();
  if (sort === "top") params.set("sort", "top");
  if (instagram) params.set("instagram", instagram);

  const { data, error, isLoading, mutate } = useSWR<{ photos: Photo[] }>(
    `/api/photos?${params.toString()}`,
    fetcher,
    { refreshInterval, refreshWhenHidden: false, revalidateOnFocus: true }
  );

  return {
    photos: data?.photos ?? [],
    isLoading,
    error,
    mutate,
  };
}
