"use client";

import { useEffect } from "react";
import useSWR from "swr";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { AccessStatus } from "@/lib/access-requests";
import { saveInstagram } from "@/lib/profile";

const PENDING_KEY = "reelio_pending_handle";
const POLL_MS = 4000;

/** The handle this device asked access for, so a reload goes back to waiting instead of the search. */
export function readPendingHandle(): string | null {
  try {
    return localStorage.getItem(PENDING_KEY);
  } catch {
    return null;
  }
}

function savePendingHandle(handle: string) {
  try {
    localStorage.setItem(PENDING_KEY, handle);
  } catch {
    // Private mode — the waiting screen still works until they reload.
  }
}

export function clearPendingHandle() {
  try {
    localStorage.removeItem(PENDING_KEY);
  } catch {
    // Nothing saved to clear.
  }
}

/**
 * Asks the host to add `handle`. Returns the resulting status; on "approved" (someone added them
 * in the meantime) they're already in.
 */
export async function requestAccess(handle: string): Promise<AccessStatus> {
  const res = await fetch("/api/access-requests", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ handle }),
  });
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new Error(body?.error);

  const status = body.status as AccessStatus;
  if (status === "approved") saveInstagram(body.handle);
  else savePendingHandle(body.handle);
  return status;
}

const fetcher = (url: string) =>
  fetch(url).then((res) => res.json() as Promise<{ status: AccessStatus }>);

/**
 * Shown while the host decides. Polls the request and logs the guest in as soon as it's
 * approved, with nothing for them to tap.
 */
export function PendingAccess({ handle, onCancel }: { handle: string; onCancel: () => void }) {
  const { data } = useSWR(`/api/access-requests?handle=${encodeURIComponent(handle)}`, fetcher, {
    refreshInterval: (latest) => (latest?.status === "rejected" ? 0 : POLL_MS),
  });
  const status = data?.status;

  useEffect(() => {
    if (status === "approved") {
      clearPendingHandle();
      saveInstagram(handle);
    }
  }, [status, handle]);

  function cancel() {
    clearPendingHandle();
    onCancel();
  }

  return (
    <div className="grid gap-4">
      {status === "rejected" ? (
        <p className="text-sm text-rose-400">
          no pudimos sumar a @{handle}. si es un error, avisale a franco.
        </p>
      ) : (
        <>
          <p className="text-base text-zinc-100">
            listo, le avisamos a franco que querés entrar como <strong>@{handle}</strong>.
          </p>
          <p className="flex items-center gap-2 text-sm text-zinc-400">
            <Loader2 className="size-4 shrink-0 animate-spin" />
            apenas te apruebe entrás solo, dejá esta pantalla abierta.
          </p>
        </>
      )}
      <Button
        type="button"
        variant="ghost"
        onClick={cancel}
        className="h-11 text-base text-zinc-300"
      >
        Usar otro usuario
      </Button>
    </div>
  );
}
