"use client";

import { useEffect, useRef, useState } from "react";
import useSWR, { useSWRConfig } from "swr";
import type { EventStatus } from "@/lib/bonus";
import { noteServerTime, serverNow } from "@/lib/server-clock";
import { CHALLENGES_KEY } from "@/hooks/use-challenges";

async function fetchStatus(url: string): Promise<EventStatus> {
  const sent = Date.now();
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error("No se pudo consultar el estado del evento");
  const status: EventStatus = await res.json();
  noteServerTime(status.serverNow, sent, Date.now());
  return status;
}

/**
 * Where the bonus track stands, polled every 15 s so the phase flips without a reload. When it does,
 * the challenge list and quota are refetched right away (that's when the bonus challenges arrive).
 */
export function useEventStatus(): EventStatus | undefined {
  const { mutate } = useSWRConfig();
  const { data } = useSWR("/api/event-status", fetchStatus, {
    refreshInterval: 15000,
    revalidateOnFocus: true,
  });

  const phase = data?.phase;
  const previous = useRef(phase);
  useEffect(() => {
    if (previous.current !== undefined && phase !== previous.current) {
      mutate(CHALLENGES_KEY);
      mutate((key) => typeof key === "string" && key.startsWith("/api/quota"));
    }
    previous.current = phase;
  }, [phase, mutate]);

  return data;
}

/** Server time, re-rendering every `intervalMs`. Null until mounted (avoids a hydration mismatch). */
export function useServerNow(intervalMs = 1000) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => setNow(serverNow());
    tick();
    const interval = setInterval(tick, intervalMs);
    return () => clearInterval(interval);
  }, [intervalMs]);
  return now;
}
