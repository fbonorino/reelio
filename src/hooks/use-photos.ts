"use client";

import useSWR from "swr";
import type { Photo } from "@/lib/types";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function usePhotos(sort: "new" | "top", deviceId: string) {
  const params = new URLSearchParams();
  if (sort === "top") params.set("sort", "top");
  if (deviceId) params.set("deviceId", deviceId);

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
