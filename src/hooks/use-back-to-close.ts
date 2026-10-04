"use client";

import { useEffect, useRef } from "react";

const MARKER = "reelioOverlay";

/** Pending `history.back()` from an overlay that just closed; a remount (StrictMode) or the next overlay cancels it. */
let pendingBack: ReturnType<typeof setTimeout> | undefined;

/**
 * Makes the phone's Back button (or gesture) close a full-screen overlay instead of leaving
 * the app: while `open`, adds a history entry that Back pops. Closing from the UI removes it.
 * With `dismissible: false` (e.g. mid-upload) Back is swallowed and the overlay stays.
 */
export function useBackToClose(open: boolean, onClose: () => void, { dismissible = true } = {}) {
  const onCloseRef = useRef(onClose);
  const dismissibleRef = useRef(dismissible);
  useEffect(() => {
    onCloseRef.current = onClose;
    dismissibleRef.current = dismissible;
  });

  useEffect(() => {
    if (!open) return;
    clearTimeout(pendingBack);
    // Reuses the entry when one overlay hands over to another before the pending Back ran.
    if (!window.history.state?.[MARKER]) {
      window.history.pushState({ ...window.history.state, [MARKER]: true }, "");
    }

    let popped = false;
    function handlePop() {
      if (!dismissibleRef.current) {
        window.history.pushState({ ...window.history.state, [MARKER]: true }, "");
        return;
      }
      popped = true;
      onCloseRef.current();
    }
    window.addEventListener("popstate", handlePop);

    return () => {
      window.removeEventListener("popstate", handlePop);
      if (popped) return;
      pendingBack = setTimeout(() => {
        if (window.history.state?.[MARKER]) window.history.back();
      });
    };
  }, [open]);
}
