/**
 * A guest's first entry into Reelio. There's no login request: onboarding saves the handle on the
 * phone, and the first time the server confirms it against the guest list (/api/quota, right after)
 * is when they got in. Kept apart from Prisma so the tests can run it against a fake store.
 */

export type EntryStore = {
  /** The guest-list row, or null if the handle isn't on it. */
  find: (handle: string) => Promise<{ firstEnteredAt: Date | null } | null>;
  /**
   * Sets firstEnteredAt only where it's still null (`UPDATE … WHERE "firstEnteredAt" IS NULL`), so
   * two requests racing on the first open can't overwrite each other.
   */
  setFirstEnteredIfUnset: (handle: string, at: Date) => Promise<void>;
};

/**
 * Whether `handle` is on the guest list, recording their first entry if this is it. The lookup is
 * the same one the invite check already needs, so once it's set it costs no extra query.
 */
export async function checkInGuest(handle: string, store: EntryStore, now: Date): Promise<boolean> {
  const row = await store.find(handle);
  if (!row) return false;
  if (!row.firstEnteredAt) await store.setFirstEnteredIfUnset(handle, now);
  return true;
}
