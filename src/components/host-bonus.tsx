"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Check, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useHostBonus } from "@/hooks/use-host-bonus";
import { formatBonusTime, type BonusOverride, type BonusPhase } from "@/lib/bonus";
import { cn } from "@/lib/utils";

/** Buenos Aires is UTC-3 all year (no DST), so the inputs are BA wall time with a fixed offset. */
const BA_OFFSET_MS = 3 * 60 * 60 * 1000;

function toInputValue(iso: string) {
  return new Date(new Date(iso).getTime() - BA_OFFSET_MS).toISOString().slice(0, 16);
}

function fromInputValue(value: string) {
  return `${value}:00-03:00`;
}

const PHASES: Record<BonusPhase, { label: string; className: string }> = {
  before: { label: "Todavía secreto", className: "bg-zinc-800 text-zinc-300" },
  open: { label: "Abierto", className: "bg-bonus text-white" },
  closed: { label: "Cerrado", className: "bg-zinc-700 text-zinc-200" },
};

const OVERRIDES: { value: BonusOverride; label: string }[] = [
  { value: "AUTO", label: "Automático" },
  { value: "OPEN", label: "Forzar abierto" },
  { value: "CLOSED", label: "Forzar cerrado" },
];

const CONFIRM: Partial<Record<BonusOverride, string>> = {
  OPEN: "¿Abrir el bonus track ya? Las consignas bonus se vuelven públicas para todos. Volviendo a Automático antes de la hora se esconden de nuevo, pero las fotos que se suban quedan en el feed.",
  CLOSED: "¿Cerrar el bonus track ya? Las fotos bonus que estén subiéndose tienen 1 minuto para entrar.",
};

/** Host-only: when the bonus track opens and closes, and the manual override. */
export function HostBonus({ hostKey }: { hostKey: string }) {
  const { data, mutate, isLoading } = useHostBonus(hostKey);
  const [saving, setSaving] = useState<string | null>(null);

  async function save(body: Record<string, unknown>, label: string, success: string) {
    setSaving(label);
    try {
      const res = await fetch(`/api/host/bonus?key=${encodeURIComponent(hostKey)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const result = await res.json().catch(() => null);
      if (!res.ok) throw new Error(result?.error ?? "No se pudo guardar — revisá la host key");
      toast.success(success);
      await mutate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo guardar");
    } finally {
      setSaving(null);
    }
  }

  function setOverride(value: BonusOverride) {
    if (!data || value === data.override) return;
    const question = CONFIRM[value];
    if (question && !confirm(question)) return;
    save({ override: value }, value, value === "AUTO" ? "Bonus en automático" : value === "OPEN" ? "Bonus abierto" : "Bonus cerrado");
  }

  return (
    <section className="grid min-w-0 gap-3 rounded-lg bg-zinc-900 p-4 ring-1 ring-bonus/40">
      <div className="flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 font-semibold text-zinc-50">
          <Sparkles className="size-4 text-bonus" />
          Bonus track
        </h2>
        {data && (
          <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-semibold", PHASES[data.phase].className)}>
            {PHASES[data.phase].label}
          </span>
        )}
      </div>

      {isLoading || !data ? (
        <div className="flex justify-center py-6 text-zinc-400">
          <Loader2 className="size-5 animate-spin" />
        </div>
      ) : (
        <>
          <p className="text-sm text-zinc-400">
            Consignas nuevas a puntos x{data.multiplier}, de {formatBonusTime(new Date(data.startsAt))} a{" "}
            {formatBonusTime(new Date(data.effectiveEndsAt))} (hora de Buenos Aires).
            {data.closesAt && data.phase !== "before" && ` Cierra a las ${formatBonusTime(new Date(data.closesAt))}.`}{" "}
            Hora del server: {formatBonusTime(data.serverNow)}.
          </p>

          <div role="radiogroup" aria-label="Modo del bonus track" className="grid grid-cols-3 gap-1 rounded-lg bg-zinc-950 p-1 ring-1 ring-zinc-800">
            {OVERRIDES.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={data.override === value}
                disabled={saving !== null}
                onClick={() => setOverride(value)}
                className={cn(
                  "flex min-h-11 items-center justify-center gap-1 rounded-md px-2 text-xs font-semibold text-zinc-300 transition-colors sm:pointer-fine:min-h-8",
                  data.override === value ? "bg-zinc-800 text-zinc-50 ring-1 ring-zinc-600" : "hover:bg-zinc-900",
                  data.override === value && value === "OPEN" && "bg-bonus text-white ring-bonus"
                )}
              >
                {saving === value && <Loader2 className="size-3.5 animate-spin" />}
                {label}
              </button>
            ))}
          </div>

          <WindowForm
            // Reset the draft whenever the stored window changes.
            key={`${data.startsAt}:${data.endsAt}`}
            startsAt={data.startsAt}
            endsAt={data.endsAt}
            eventEnd={data.eventEnd}
            saving={saving === "window"}
            onSave={(startsAt, endsAt) => save({ startsAt, endsAt }, "window", "Horario del bonus guardado")}
          />
        </>
      )}
    </section>
  );
}

function WindowForm({
  startsAt,
  endsAt,
  eventEnd,
  saving,
  onSave,
}: {
  startsAt: string;
  endsAt: string;
  eventEnd: string | null;
  saving: boolean;
  onSave: (startsAt: string, endsAt: string) => void;
}) {
  const [start, setStart] = useState(toInputValue(startsAt));
  const [end, setEnd] = useState(toInputValue(endsAt));
  const dirty = start !== toInputValue(startsAt) || end !== toInputValue(endsAt);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (dirty && start && end) onSave(fromInputValue(start), fromInputValue(end));
      }}
      className="grid gap-2 border-t border-zinc-800 pt-3"
    >
      {/* One per row on phones: a datetime-local needs ~250px to show the date and the time. */}
      <div className="grid gap-2 sm:grid-cols-2">
        <label className="grid gap-1 text-xs text-zinc-400">
          Abre
          <Input
            type="datetime-local"
            value={start}
            onChange={(e) => setStart(e.target.value)}
            className="h-11 border-zinc-700 bg-zinc-950 text-base sm:pointer-fine:h-8 sm:text-sm"
          />
        </label>
        <label className="grid gap-1 text-xs text-zinc-400">
          Cierra
          <Input
            type="datetime-local"
            value={end}
            max={eventEnd ? toInputValue(eventEnd) : undefined}
            onChange={(e) => setEnd(e.target.value)}
            className="h-11 border-zinc-700 bg-zinc-950 text-base sm:pointer-fine:h-8 sm:text-sm"
          />
        </label>
      </div>
      <div className="flex items-center gap-2">
        <p className="min-w-0 flex-1 text-xs text-zinc-500">
          Hora de Buenos Aires.
          {eventEnd && ` No puede cerrar después del cierre del juego (${formatBonusTime(new Date(eventEnd))}).`}
        </p>
        {dirty && (
          <Button
            type="submit"
            disabled={saving || !start || !end}
            className="h-11 shrink-0 bg-amber-500 px-3 text-zinc-950 hover:bg-amber-400 sm:pointer-fine:h-8"
          >
            {saving ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
            Guardar horario
          </Button>
        )}
      </div>
    </form>
  );
}
