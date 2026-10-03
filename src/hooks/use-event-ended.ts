"use client";

import { useEffect, useState } from "react";
import { getEventEnd } from "@/lib/event";
import { serverNow, syncServerClock } from "@/lib/server-clock";

const eventEnd = getEventEnd();

/**
 * Flips to true the moment NEXT_PUBLIC_EVENT_END_TIME passes on the server's clock, without
 * a reload, so a phone with a wrong clock doesn't close early or late.
 * Starts false until mounted, which avoids a server/client time mismatch.
 */
export function useEventEnded() {
  const [ended, setEnded] = useState(false);

  useEffect(() => {
    if (!eventEnd) return;
    const end = eventEnd.getTime();
    let cancelled = false;
    let timeout: ReturnType<typeof setTimeout> | undefined;

    syncServerClock().then(() => {
      if (cancelled) return;
      const remaining = Math.max(0, end - serverNow());
      // setTimeout overflows past ~24.8 days; an end that far away will be picked up on a later load.
      if (remaining > 2 ** 31 - 1) return;
      timeout = setTimeout(() => setEnded(true), remaining);
    });

    // A phone asleep at the deadline may hold the timer back; catch up when it wakes.
    function handleVisible() {
      if (document.visibilityState === "visible" && serverNow() >= end) setEnded(true);
    }
    document.addEventListener("visibilitychange", handleVisible);

    return () => {
      cancelled = true;
      clearTimeout(timeout);
      document.removeEventListener("visibilitychange", handleVisible);
    };
  }, []);

  return ended;
}
