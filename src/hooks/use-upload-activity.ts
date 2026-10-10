"use client";

import { useSyncExternalStore } from "react";
import { feedRefreshInterval, isUploadActive, subscribeUploadActivity } from "@/lib/upload-activity";

/** SWR `refreshInterval` for the feed and the ranking: every 10 s, paused while this device uploads. */
export function useFeedRefreshInterval() {
  const uploading = useSyncExternalStore(subscribeUploadActivity, isUploadActive, () => false);
  return feedRefreshInterval(uploading);
}
