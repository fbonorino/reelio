"use client";

import { useSyncExternalStore } from "react";
import { normalizeInstagram } from "@/lib/instagram";

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
