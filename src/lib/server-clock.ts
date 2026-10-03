"use client";

/** Server time minus device time, in ms. 0 until synced, or if the sync fails. */
let offset = 0;
let sync: Promise<void> | null = null;

/** Measures how far off the device clock is from the server's, once per page load. */
export function syncServerClock() {
  sync ??= (async () => {
    try {
      const sent = Date.now();
      const res = await fetch("/api/time", { cache: "no-store" });
      const { now } = await res.json();
      const received = Date.now();
      // Assume the response was stamped halfway through the round trip.
      if (typeof now === "number") offset = now - (sent + received) / 2;
    } catch {
      // Offline or server hiccup: fall back to the device clock.
    }
  })();
  return sync;
}

/** Current time per the server's clock (the device's until synced). */
export function serverNow() {
  return Date.now() + offset;
}
