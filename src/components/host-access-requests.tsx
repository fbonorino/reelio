"use client";

import { useState } from "react";
import useSWR, { useSWRConfig } from "swr";
import { toast } from "sonner";
import { Check, Inbox, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { instagramUrl } from "@/lib/instagram";

type AccessRequest = { handle: string; createdAt: string };
type Action = "approve" | "reject" | "reopen";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

function timeAgo(iso: string) {
  const minutes = Math.max(0, Math.round((Date.now() - Date.parse(iso)) / 60000));
  if (minutes < 1) return "recién";
  if (minutes < 60) return `hace ${minutes} min`;
  return `hace ${Math.floor(minutes / 60)} h ${minutes % 60} min`;
}

/**
 * Host-only: guests who weren't on the list and asked in. One tap approves (they get in on their
 * own) or rejects (with an undo, since it's easy to fat-finger at a party).
 */
export function HostAccessRequests({ hostKey }: { hostKey: string }) {
  const keyParam = `key=${encodeURIComponent(hostKey)}`;
  const { mutate: mutateGlobal } = useSWRConfig();
  const { data, mutate, isLoading } = useSWR<{ requests: AccessRequest[] }>(
    `/api/host/access-requests?${keyParam}`,
    fetcher,
    { refreshInterval: 5000 }
  );
  const [busy, setBusy] = useState<string | null>(null);
  const requests = data?.requests ?? [];

  async function act(handle: string, action: Action) {
    setBusy(handle);
    try {
      const res = await fetch(`/api/host/access-requests?${keyParam}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ handle, action }),
      });
      if (!res.ok) throw new Error();

      if (action === "approve") {
        toast.success(`@${handle} ya puede entrar`);
        // The guest list card shows them now too.
        mutateGlobal((k) => typeof k === "string" && k.startsWith("/api/host/handles"));
      } else if (action === "reject") {
        toast(`Rechazaste a @${handle}`, {
          action: { label: "Deshacer", onClick: () => act(handle, "reopen") },
        });
      }
      mutate();
    } catch {
      toast.error("No se pudo actualizar — revisá la host key");
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="grid min-w-0 gap-3 rounded-lg bg-zinc-900 p-4 ring-1 ring-zinc-800">
      <div className="flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 font-semibold text-zinc-50">
          <Inbox className="size-4" />
          Pedidos de acceso
        </h2>
        <span
          className={
            requests.length > 0
              ? "rounded-full bg-indigo-600 px-2.5 py-0.5 text-xs font-semibold text-white"
              : "rounded-full bg-zinc-800 px-2.5 py-0.5 text-xs text-zinc-300"
          }
        >
          {isLoading ? "…" : requests.length}
        </span>
      </div>

      {requests.length === 0 ? (
        <p className="text-sm text-zinc-400">
          {isLoading ? "Cargando…" : "Nadie está esperando. Se actualiza solo."}
        </p>
      ) : (
        <ul className="divide-y divide-zinc-800 rounded-md ring-1 ring-zinc-800">
          {requests.map((r) => (
            <li key={r.handle} className="flex flex-wrap items-center gap-2 p-3 sm:flex-nowrap sm:py-2 sm:pr-2">
              {/* Own line on phones, so both buttons can be wide, thumb-sized targets. */}
              <div className="min-w-0 basis-full sm:basis-auto sm:flex-1">
                <a
                  href={instagramUrl(r.handle)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block truncate text-base text-zinc-100 underline-offset-2 hover:underline"
                >
                  @{r.handle}
                </a>
                <span className="text-xs text-zinc-500">{timeAgo(r.createdAt)}</span>
              </div>
              {busy === r.handle ? (
                <Loader2 className="mx-auto h-12 size-5 animate-spin text-zinc-400 sm:mx-4" />
              ) : (
                <>
                  <Button
                    variant="ghost"
                    onClick={() => act(r.handle, "reject")}
                    className="h-12 flex-1 px-3 text-base text-zinc-400 ring-1 ring-zinc-800 hover:text-rose-400 sm:flex-none sm:ring-0"
                  >
                    <X className="size-5" />
                    Rechazar
                  </Button>
                  <Button
                    onClick={() => act(r.handle, "approve")}
                    className="h-12 flex-1 bg-emerald-600 px-4 text-base text-white hover:bg-emerald-500 sm:flex-none"
                  >
                    <Check className="size-5" />
                    Aprobar
                  </Button>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
