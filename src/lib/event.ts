/**
 * Event end time from NEXT_PUBLIC_EVENT_END_TIME, as an ISO date with offset,
 * e.g. "2026-09-28T04:00:00-03:00". Returns null when unset or unparseable
 * (no countdown, no cutoff).
 */
export function getEventEnd(): Date | null {
  const raw = process.env.NEXT_PUBLIC_EVENT_END_TIME;
  if (!raw) return null;
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function hasEventEnded(now = Date.now()) {
  const end = getEventEnd();
  return end !== null && now >= end.getTime();
}
