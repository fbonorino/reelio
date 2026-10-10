/**
 * Whether this device is uploading right now. The feed and the ranking stop polling meanwhile, so
 * the club's thin signal goes to the photo instead of to refreshing lists.
 */

/** How often the feed and the ranking refresh. Each poll downloads the whole list. */
export const FEED_REFRESH_MS = 10_000;

let active = 0;
const listeners = new Set<() => void>();

/** Marks one upload as started; call the returned function when it ends (success or not). */
export function beginUploadActivity(): () => void {
  active++;
  listeners.forEach((l) => l());
  let ended = false;
  return () => {
    if (ended) return;
    ended = true;
    active--;
    listeners.forEach((l) => l());
  };
}

export function isUploadActive() {
  return active > 0;
}

export function subscribeUploadActivity(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** SWR `refreshInterval` for the feed and the ranking: 0 (paused) while uploading. */
export function feedRefreshInterval(uploading: boolean) {
  return uploading ? 0 : FEED_REFRESH_MS;
}
