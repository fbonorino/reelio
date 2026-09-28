"use client";

import { useState } from "react";
import useSWR from "swr";
import { toast } from "sonner";
import { Loader2, Trash2, UserPlus, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type Guest = { handle: string; createdAt: string };

const fetcher = (url: string) => fetch(url).then((res) => res.json());

/** Host-only guest list: bulk-add pasted handles, see everyone, remove one. */
export function HostGuests({ hostKey }: { hostKey: string }) {
  const keyParam = `key=${encodeURIComponent(hostKey)}`;
  const { data, mutate, isLoading } = useSWR<{ guests: Guest[] }>(
    `/api/host/handles?${keyParam}`,
    fetcher
  );
  const [text, setText] = useState("");
  const [adding, setAdding] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);
  const [filter, setFilter] = useState("");

  const guests = data?.guests ?? [];
  const f = filter.trim().replace(/^@+/, "").toLowerCase();
  const visible = f ? guests.filter((g) => g.handle.includes(f)) : guests;

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setAdding(true);
    try {
      const res = await fetch(`/api/host/handles?${keyParam}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const result = await res.json().catch(() => null);
      if (!res.ok) throw new Error(result?.error);

      const parts = [`${result.added} agregados`];
      if (result.duplicates > 0) parts.push(`${result.duplicates} ya estaban`);
      toast.success(parts.join(" · "));
      if (result.invalid.length > 0) {
        toast.error(`No parecen @ válidos: ${result.invalid.join(", ")}`);
        // Leave only the bad ones in the box so they can be fixed.
        setText(result.invalid.join("\n"));
      } else {
        setText("");
      }
      mutate();
    } catch (err) {
      toast.error(err instanceof Error && err.message ? err.message : "No se pudo cargar la lista");
    } finally {
      setAdding(false);
    }
  }

  async function handleRemove(handle: string) {
    if (!confirm(`¿Sacar a @${handle} de la lista? Sus fotos quedan, pero no va a poder subir ni likear.`)) {
      return;
    }
    setRemoving(handle);
    try {
      const res = await fetch(
        `/api/host/handles?${keyParam}&handle=${encodeURIComponent(handle)}`,
        { method: "DELETE" }
      );
      if (!res.ok) throw new Error();
      toast.success(`@${handle} ya no está en la lista`);
      mutate();
    } catch {
      toast.error("No se pudo sacar — revisá la host key");
    } finally {
      setRemoving(null);
    }
  }

  return (
    <section className="grid min-w-0 gap-3 rounded-lg bg-zinc-900 p-4 ring-1 ring-zinc-800">
      <div className="flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 font-semibold text-zinc-50">
          <Users className="size-4" />
          Invitados
        </h2>
        <span className="rounded-full bg-zinc-800 px-2.5 py-0.5 text-xs text-zinc-300">
          {isLoading ? "…" : guests.length}
        </span>
      </div>
      <p className="text-sm text-zinc-500">
        Solo estos @ pueden subir fotos y likear. Si sacás a alguien, sus fotos quedan.
      </p>

      <form onSubmit={handleAdd} className="grid gap-2">
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={"Pegá los @, uno por línea o separados por coma\n@fran_bonorino, @otro.invitado"}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          className="min-h-24 border-zinc-700 bg-zinc-950"
        />
        <Button
          type="submit"
          disabled={adding || !text.trim()}
          className="h-11 bg-indigo-600 hover:bg-indigo-500 sm:h-8"
        >
          {adding ? <Loader2 className="size-4 animate-spin" /> : <UserPlus className="size-4" />}
          Agregar a la lista
        </Button>
      </form>

      {guests.length > 0 && (
        <>
          <Input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filtrar la lista"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            className="h-11 border-zinc-700 bg-zinc-950 sm:h-8"
          />
          <ul className="max-h-80 divide-y divide-zinc-800 overflow-y-auto rounded-md ring-1 ring-zinc-800">
            {visible.map((guest) => (
              <li
                key={guest.handle}
                className="flex items-center justify-between gap-2 py-0.5 pl-3 pr-1 text-base sm:py-1.5 sm:pr-3 sm:text-sm"
              >
                <span className="min-w-0 truncate text-zinc-200">@{guest.handle}</span>
                <Button
                  size="icon-sm"
                  variant="ghost"
                  aria-label={`Sacar a @${guest.handle}`}
                  disabled={removing === guest.handle}
                  onClick={() => handleRemove(guest.handle)}
                  className="size-11 text-zinc-500 hover:text-rose-400 sm:size-7"
                >
                  {removing === guest.handle ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Trash2 className="size-4" />
                  )}
                </Button>
              </li>
            ))}
            {visible.length === 0 && (
              <li className="px-3 py-2 text-sm text-zinc-500">Nadie coincide con “{filter}”.</li>
            )}
          </ul>
        </>
      )}
    </section>
  );
}
