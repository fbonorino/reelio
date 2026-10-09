"use client";

import useSWR from "swr";
import { toast } from "sonner";
import { forgetIfNotInvited } from "@/lib/profile";

type Count = { used: number; remaining: number; max: number };

/** Top-level counts are challenge photos; `free` is "Foto libre" and `bonus` the bonus track, each capped separately. */
export type Quota = Count & {
  free: Count;
  bonus: Count & {
    /** Bonus challenges already used: one photo each. */
    challengeIds: string[];
    /** While the window is open: send it with a bonus upload, for the grace period after the close. */
    ticket: string | null;
  };
};

async function fetchQuota(url: string): Promise<Quota> {
  const res = await fetch(url);
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    // Saved handle was removed from the guest list: send them back to onboarding.
    if (forgetIfNotInvited(data)) toast.error(data.error);
    throw new Error(data?.error ?? "No se pudo consultar el cupo");
  }
  return data;
}

/**
 * Server-side photo quota for the saved handle. Doubles as the check that the handle is
 * still on the guest list, both on app open and periodically after.
 */
export function useQuota(instagram: string | null | undefined) {
  const { data } = useSWR(
    instagram ? `/api/quota?instagram=${encodeURIComponent(instagram)}` : null,
    fetchQuota,
    { refreshInterval: 15000, revalidateOnFocus: true }
  );
  return data;
}
