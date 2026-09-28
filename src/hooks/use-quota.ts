"use client";

import useSWR from "swr";
import { toast } from "sonner";
import { forgetIfNotInvited } from "@/lib/profile";

type Quota = { used: number; remaining: number; max: number };

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
