"use client";

import { useEffect, useState } from "react";
import { getEventEnd } from "@/lib/event";

const eventEnd = getEventEnd();

/**
 * Flips to true the moment NEXT_PUBLIC_EVENT_END_TIME passes, without a reload.
 * Starts false until mounted, which avoids a server/client time mismatch.
 */
export function useEventEnded() {
  const [ended, setEnded] = useState(false);

  useEffect(() => {
    if (!eventEnd) return;
    const remaining = Math.max(0, eventEnd.getTime() - Date.now());
    // setTimeout overflows past ~24.8 days; an end that far away will be picked up on a later load.
    if (remaining > 2 ** 31 - 1) return;
    const timeout = setTimeout(() => setEnded(true), remaining);
    return () => clearTimeout(timeout);
  }, []);

  return ended;
}
