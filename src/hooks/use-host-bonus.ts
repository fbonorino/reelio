"use client";

import useSWR from "swr";
import type { BonusOverride, BonusPhase } from "@/lib/bonus";

export type HostBonus = {
  serverNow: number;
  phase: BonusPhase;
  startsAt: string;
  endsAt: string;
  effectiveEndsAt: string;
  closesAt: string | null;
  eventEnd: string | null;
  override: BonusOverride;
  overrideAt: string | null;
  multiplier: number;
  publicUrl: string | null;
  publicUrlError: string | null;
};

async function fetchHostBonus(url: string) {
  const sent = Date.now();
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error("No se pudo cargar el bonus track — revisá la host key");
  const data: HostBonus = await res.json();
  // Server time minus device time, so the host's reminders don't depend on the phone's clock.
  return { ...data, offset: data.serverNow - (sent + Date.now()) / 2 };
}

/** Host-only: the bonus window and override, shared by the settings card, the reminders and the WhatsApp card. */
export function useHostBonus(hostKey: string) {
  return useSWR(`/api/host/bonus?key=${encodeURIComponent(hostKey)}`, fetchHostBonus, {
    refreshInterval: 15000,
    revalidateOnFocus: true,
  });
}
