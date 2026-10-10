"use client";

import useSWR from "swr";
import { toast } from "sonner";
import { forgetIfNotInvited } from "@/lib/profile";

async function fetchGuests(url: string): Promise<string[]> {
  const res = await fetch(url, { cache: "no-store" });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    if (forgetIfNotInvited(data)) toast.error(data.error);
    throw new Error(data?.error ?? "No se pudo cargar la lista de invitados");
  }
  return data.handles;
}

/**
 * Handles of the guests who already got in, newest first. Only fetched (and refreshed every 30 s)
 * while `active`, i.e. while the panel is open; reopening shows the last list right away.
 */
export function useGuests(instagram: string | null | undefined, active: boolean) {
  return useSWR(
    active && instagram ? `/api/guests?instagram=${encodeURIComponent(instagram)}` : null,
    fetchGuests,
    { refreshInterval: 30000, revalidateOnFocus: true, keepPreviousData: true }
  );
}
