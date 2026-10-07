"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ShieldAlert } from "lucide-react";
import { HostAccessRequests } from "@/components/host-access-requests";

/** Just the access requests, to keep open on the host's phone during the party. */
export default function AccessRequestsPage() {
  return (
    <Suspense fallback={null}>
      <AccessRequestsView />
    </Suspense>
  );
}

function AccessRequestsView() {
  const key = useSearchParams().get("key") ?? "";

  if (!key) {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-zinc-950 px-6 text-center text-zinc-400">
        <ShieldAlert className="size-10" />
        <p>Agregá <code className="rounded bg-zinc-900 px-1.5 py-0.5">?key=YOUR_HOST_SECRET</code> a la URL.</p>
      </main>
    );
  }

  return (
    <main className="mx-auto grid min-h-dvh w-full max-w-lg content-start gap-3 bg-zinc-950 px-4 pb-[calc(2rem+env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))]">
      <HostAccessRequests hostKey={key} />
      <Link
        href={`/host?key=${encodeURIComponent(key)}`}
        className="py-3 text-center text-sm text-zinc-400 underline underline-offset-2"
      >
        Ir al panel completo
      </Link>
    </main>
  );
}
