"use client";

import { useSyncExternalStore } from "react";
import { normalizeInstagram, NOT_INVITED } from "@/lib/instagram";

const INSTAGRAM_KEY = "reelio_instagram";

const listeners = new Set<() => void>();

function readInstagram(): string | null {
  try {
    return normalizeInstagram(localStorage.getItem(INSTAGRAM_KEY));
  } catch {
    return null;
  }
}

export function saveInstagram(handle: string) {
  try {
    localStorage.setItem(INSTAGRAM_KEY, handle);
  } catch {
    // Private mode etc. — still update in-memory subscribers below.
  }
  cachedHandle = handle;
  listeners.forEach((l) => l());
}

export function clearInstagram() {
  try {
    localStorage.removeItem(INSTAGRAM_KEY);
  } catch {
    // Ignore — the in-memory reset below is what re-opens onboarding.
  }
  cachedHandle = null;
  listeners.forEach((l) => l());
}

/**
 * Call with an API error body. If the server says the saved handle is no longer on the
 * guest list, forgets it so onboarding asks again. Returns whether it did.
 */
export function forgetIfNotInvited(body: unknown) {
  if ((body as { code?: unknown } | null)?.code !== NOT_INVITED) return false;
  clearInstagram();
  return true;
}

let cachedHandle: string | null | undefined;

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  if (cachedHandle === undefined) cachedHandle = readInstagram();
  return cachedHandle;
}

/**
 * The guest's saved Instagram handle. `undefined` during SSR / before hydration,
 * `null` if they haven't onboarded yet.
 */
export function useInstagram(): string | null | undefined {
  return useSyncExternalStore(subscribe, getSnapshot, () => undefined);
}
