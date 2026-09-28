"use client";

import { useState } from "react";
import useSWR from "swr";
import { Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

type Summary = { kind: "image" | "video"; count: number; parts: number };

const fetcher = (url: string) => fetch(url).then((res) => res.json());

/**
 * "Download everything": originals from Cloudinary, zipped on the server. Big sets are split
 * into several ZIPs (see EXPORT_PART_SIZE), each its own link since browsers block multiple
 * automatic downloads.
 */
export function HostExport({ hostKey }: { hostKey: string }) {
  const keyParam = `key=${encodeURIComponent(hostKey)}`;
  const [open, setOpen] = useState(false);
  const { data, isLoading } = useSWR<{ summary: Summary[] }>(
    open ? `/api/host/export?${keyParam}` : null,
    fetcher,
    { revalidateOnFocus: false }
  );

  return (
    <section className="grid gap-3 rounded-lg bg-zinc-900 p-4 ring-1 ring-zinc-800">
      <Button onClick={() => setOpen(true)} disabled={open} variant="secondary">
        <Download className="size-4" />
        Descargar todo (ZIP)
      </Button>
      {open &&
        (isLoading || !data ? (
          <Loader2 className="mx-auto size-5 animate-spin text-zinc-500" />
        ) : (
          <div className="grid gap-3 text-sm">
            <p className="text-zinc-500">
              Archivos originales en máxima calidad, incluidas las invalidadas. Fotos y videos van en
              ZIPs separados y, si son muchos, en varias partes: bajá cada una y esperá a que termine
              antes de la siguiente.
            </p>
            {data.summary.map(({ kind, count, parts }) => (
              <div key={kind} className="grid gap-1.5">
                <span className="font-medium text-zinc-200">
                  {kind === "image" ? "Fotos" : "Videos"} ({count})
                </span>
                {count === 0 ? (
                  <span className="text-zinc-500">No hay.</span>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {Array.from({ length: parts }, (_, i) => (
                      <Button key={i} asChild size="sm" className="bg-indigo-600 hover:bg-indigo-500">
                        <a href={`/api/host/export?${keyParam}&kind=${kind}&part=${i + 1}`} download>
                          <Download className="size-4" />
                          {parts > 1 ? `Parte ${i + 1} de ${parts}` : "Descargar ZIP"}
                        </a>
                      </Button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        ))}
    </section>
  );
}
