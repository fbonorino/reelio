"use client";

import useSWR from "swr";
import type { Photo } from "@/lib/types";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

/** `instagram` is the viewer's handle, used by the server to fill in `likedByMe`. */
export function usePhotos(sort: "new" | "top", instagram: string | null | undefined) {
  const params = new URLSearchParams();
  if (sort === "top") params.set("sort", "top");
  if (instagram) params.set("instagram", instagram);

  const { data, error, isLoading, mutate } = useSWR<{ photos: Photo[] }>(
    `/api/photos?${params.toString()}`,
    fetcher,
    { refreshInterval: 4000, revalidateOnFocus: true }
  );

  return {
    photos: data?.photos ?? [],
    isLoading,
    error,
    mutate,
  };
}
