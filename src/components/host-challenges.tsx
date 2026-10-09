"use client";

import { useState } from "react";
import useSWR from "swr";
import { toast } from "sonner";
import { ArrowDown, ArrowUp, Check, ListChecks, Loader2, Plus, Sparkles, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MAX_CHALLENGE_LABEL, MAX_CHALLENGE_POINTS, type Challenge } from "@/lib/challenges";
import { BONUS_MULTIPLIER, effectivePoints } from "@/lib/bonus";
import { cn } from "@/lib/utils";

type HostChallenge = Challenge & { photoCount: number };

const fetcher = (url: string) => fetch(url).then((res) => res.json());

async function send(url: string, method: string, body?: unknown) {
  const res = await fetch(url, {
    method,
    headers: body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const result = await res.json().catch(() => null);
  if (!res.ok) throw new Error(result?.error ?? "No se pudo guardar — revisá la host key");
  return result;
}

function errorMessage(err: unknown) {
  return err instanceof Error && err.message ? err.message : "No se pudo guardar";
}

/** "" or anything that isn't a whole number in range → null. */
function parsePoints(text: string) {
  const n = Number(text);
  return text.trim() !== "" && Number.isInteger(n) && n >= 0 && n <= MAX_CHALLENGE_POINTS ? n : null;
}

const INPUT = "h-11 border-zinc-700 bg-zinc-950 text-base sm:pointer-fine:h-8 sm:text-sm";
const ICON_BUTTON = "size-11 shrink-0 sm:pointer-fine:size-8";

/**
 * Host-only: the challenges guests pick from. Edit the text and points, reorder, add, remove.
 * `bonus` edits the bonus track list instead: the host types base points, guests see them multiplied.
 */
export function HostChallenges({ hostKey, bonus = false }: { hostKey: string; bonus?: boolean }) {
  const keyParam = `key=${encodeURIComponent(hostKey)}`;
  const listUrl = `/api/host/challenges?${keyParam}${bonus ? "&bonus=1" : ""}`;
  const { data, mutate, isLoading } = useSWR<{ challenges: HostChallenge[] }>(listUrl, fetcher);
  const challenges = data?.challenges ?? [];
  const [moving, setMoving] = useState(false);

  async function move(index: number, delta: -1 | 1) {
    const order = [...challenges];
    const [moved] = order.splice(index, 1);
    order.splice(index + delta, 0, moved);
    setMoving(true);
    try {
      // Shown in the new order right away; rolled back if the server says no.
      await mutate(
        async () => {
          await send(listUrl, "PUT", { order: order.map((c) => c.id) });
          return { challenges: order };
        },
        { optimisticData: { challenges: order }, rollbackOnError: true, revalidate: false }
      );
    } catch (err) {
      toast.error(errorMessage(err));
      mutate();
    } finally {
      setMoving(false);
    }
  }

  async function remove(challenge: HostChallenge) {
    const photos =
      challenge.photoCount > 0
        ? ` Las ${challenge.photoCount} fotos que ya se subieron con ella quedan y conservan sus puntos.`
        : "";
    if (!confirm(`¿Sacar “${challenge.label}” del juego?${photos}`)) return;
    try {
      await send(`/api/host/challenges/${challenge.id}?${keyParam}`, "DELETE");
      toast.success("Consigna eliminada");
      mutate();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }

  return (
    <section
      className={cn(
        "grid min-w-0 gap-3 rounded-lg bg-zinc-900 p-4 ring-1",
        bonus ? "ring-bonus/40" : "ring-zinc-800"
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 font-semibold text-zinc-50">
          {bonus ? <Sparkles className="size-4 text-bonus" /> : <ListChecks className="size-4" />}
          {bonus ? "Consignas bonus" : "Consignas"}
        </h2>
        <span className="rounded-full bg-zinc-800 px-2.5 py-0.5 text-xs text-zinc-300">
          {isLoading ? "…" : challenges.length}
        </span>
      </div>
      <p className="text-sm text-zinc-400">
        {bonus &&
          `Secretas hasta que abre el bonus track. Cargá los puntos base: los invitados ven y suman x${BONUS_MULTIPLIER}. Una foto por consigna por invitado. `}
        Los invitados las ven en este orden. Un cambio de puntos vale para las fotos que se suban
        de ahora en más: las que ya están conservan los puntos con los que se subieron.
      </p>

      {isLoading ? (
        <div className="flex justify-center py-6 text-zinc-400">
          <Loader2 className="size-5 animate-spin" />
        </div>
      ) : (
        <ol className="grid gap-2">
          {challenges.map((c, i) => (
            <ChallengeRow
              // Points and label in the key: a saved edit resets the row's draft to what's stored.
              key={`${c.id}:${c.points}:${c.label}`}
              challenge={c}
              position={i + 1}
              url={`/api/host/challenges/${c.id}?${keyParam}`}
              bonus={bonus}
              canMoveUp={i > 0 && !moving}
              canMoveDown={i < challenges.length - 1 && !moving}
              onMove={(delta) => move(i, delta)}
              onSaved={() => mutate()}
              onRemove={() => remove(c)}
            />
          ))}
        </ol>
      )}

      <NewChallenge url={listUrl} bonus={bonus} onAdded={() => mutate()} />
    </section>
  );
}

function ChallengeRow({
  challenge,
  position,
  url,
  bonus,
  canMoveUp,
  canMoveDown,
  onMove,
  onSaved,
  onRemove,
}: {
  challenge: HostChallenge;
  position: number;
  url: string;
  bonus: boolean;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onMove: (delta: -1 | 1) => void;
  onSaved: () => void;
  onRemove: () => void;
}) {
  const [label, setLabel] = useState(challenge.label);
  const [pointsText, setPointsText] = useState(String(challenge.points));
  const [saving, setSaving] = useState(false);

  const points = parsePoints(pointsText);
  const dirty = label.trim() !== challenge.label || points !== challenge.points;
  const valid = label.trim() !== "" && points !== null;

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!dirty || !valid) return;
    setSaving(true);
    try {
      await send(url, "PATCH", { label, points });
      toast.success("Consigna guardada");
      onSaved();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <li
      className={cn(
        "rounded-md bg-zinc-950 p-2 ring-1 ring-zinc-800",
        dirty && "ring-amber-500/60"
      )}
    >
      <form onSubmit={handleSave} className="grid gap-2">
        <div className="flex items-center gap-2">
          <span className="w-5 shrink-0 text-center text-xs tabular-nums text-zinc-500">{position}</span>
          <Input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            maxLength={MAX_CHALLENGE_LABEL}
            aria-label={`Consigna ${position}`}
            className={INPUT}
          />
        </div>
        {/* The bonus row also shows the effective points: on a phone the buttons wrap below. */}
        <div className={cn("flex items-center gap-2 pl-7", bonus && "flex-wrap")}>
          <Input
            value={pointsText}
            onChange={(e) => setPointsText(e.target.value)}
            inputMode="numeric"
            aria-label={`Puntos de la consigna ${position}`}
            aria-invalid={points === null}
            className={cn(INPUT, "w-20 text-center tabular-nums")}
          />
          <span className="text-sm text-zinc-400">{bonus ? "base" : "pts"}</span>
          {bonus && points !== null && <EffectivePoints points={points} />}
          {challenge.photoCount > 0 && (
            <span className="truncate text-xs text-zinc-500">
              · {challenge.photoCount} foto{challenge.photoCount === 1 ? "" : "s"}
            </span>
          )}
          <div className="ml-auto flex items-center gap-1">
            {dirty ? (
              <Button
                type="submit"
                disabled={saving || !valid}
                className="h-11 bg-amber-500 px-3 text-zinc-950 hover:bg-amber-400 sm:pointer-fine:h-8"
              >
                {saving ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
                Guardar
              </Button>
            ) : (
              <>
                <Button
                  type="button"
                  size="icon-sm"
                  variant="ghost"
                  aria-label="Subir"
                  disabled={!canMoveUp}
                  onClick={() => onMove(-1)}
                  className={cn(ICON_BUTTON, "text-zinc-400")}
                >
                  <ArrowUp className="size-4" />
                </Button>
                <Button
                  type="button"
                  size="icon-sm"
                  variant="ghost"
                  aria-label="Bajar"
                  disabled={!canMoveDown}
                  onClick={() => onMove(1)}
                  className={cn(ICON_BUTTON, "text-zinc-400")}
                >
                  <ArrowDown className="size-4" />
                </Button>
                <Button
                  type="button"
                  size="icon-sm"
                  variant="ghost"
                  aria-label={`Eliminar “${challenge.label}”`}
                  onClick={onRemove}
                  className={cn(ICON_BUTTON, "text-zinc-500 hover:text-rose-400")}
                >
                  <Trash2 className="size-4" />
                </Button>
              </>
            )}
          </div>
        </div>
      </form>
    </li>
  );
}

/** "= 30 pts": what guests see and score for a bonus challenge with these base points. */
function EffectivePoints({ points }: { points: number }) {
  return (
    <span className="shrink-0 font-bonus-mono text-xs font-bold tabular-nums text-bonus">
      = {effectivePoints({ points, isBonus: true })} pts
    </span>
  );
}

function NewChallenge({ url, bonus, onAdded }: { url: string; bonus: boolean; onAdded: () => void }) {
  const [label, setLabel] = useState("");
  const [pointsText, setPointsText] = useState("");
  const [adding, setAdding] = useState(false);
  const points = parsePoints(pointsText);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!label.trim() || points === null) return;
    setAdding(true);
    try {
      await send(url, "POST", { label, points });
      toast.success("Consigna agregada al final");
      setLabel("");
      setPointsText("");
      onAdded();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setAdding(false);
    }
  }

  return (
    <form onSubmit={handleAdd} className="grid gap-2 border-t border-zinc-800 pt-3">
      <Input
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        maxLength={MAX_CHALLENGE_LABEL}
        placeholder={bonus ? "Nueva consigna bonus" : "Nueva consigna, ej: Foto con alguien disfrazado"}
        className={INPUT}
      />
      <div className="flex items-center gap-2">
        <Input
          value={pointsText}
          onChange={(e) => setPointsText(e.target.value)}
          inputMode="numeric"
          placeholder={bonus ? "Base" : "Pts"}
          aria-label={bonus ? "Puntos base de la nueva consigna bonus" : "Puntos de la nueva consigna"}
          className={cn(INPUT, "w-20 text-center tabular-nums")}
        />
        {bonus && points !== null && <EffectivePoints points={points} />}
        <Button
          type="submit"
          disabled={adding || !label.trim() || points === null}
          className={cn(
            "h-11 flex-1 text-white sm:pointer-fine:h-8",
            bonus ? "bg-bonus hover:bg-bonus/90" : "bg-indigo-600 hover:bg-indigo-500"
          )}
        >
          {adding ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
          Agregar consigna
        </Button>
      </div>
    </form>
  );
}
