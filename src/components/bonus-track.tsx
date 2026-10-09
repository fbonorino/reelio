"use client";

import { useEffect, useRef } from "react";
import { ChevronRight, HandHeart, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useServerNow } from "@/hooks/use-event-status";
import {
  BONUS_CONSENT,
  BONUS_EXTRA_PHOTOS,
  formatBonusTime,
  formatCountdown,
  type EventStatus,
  type GuestChallenge,
} from "@/lib/bonus";
import { cn } from "@/lib/utils";

const SEEN_KEY = "reelio_bonus_seen:";

/** Whether this guest already dismissed the full-screen announcement (on this device). */
export function hasSeenBonusTakeover(instagram: string) {
  try {
    return localStorage.getItem(SEEN_KEY + instagram) === "1";
  } catch {
    return false;
  }
}

export function markBonusTakeoverSeen(instagram: string) {
  try {
    localStorage.setItem(SEEN_KEY + instagram, "1");
  } catch {
    // Private mode: it'll just show again on the next load.
  }
}

/** "hasta las 4:00", or nothing when no close is set. */
function untilLabel(status: EventStatus) {
  return status.closesAt ? `hasta las ${formatBonusTime(new Date(status.closesAt))}` : "";
}

/**
 * Under the game countdown. Before: a small teaser with the time left to open. Open: the persistent
 * bonus banner with the time left to close (tap to see the bonus challenges again). Closed: a quiet note.
 * Every countdown runs on the server's clock.
 */
export function BonusBanner({ status, onOpen }: { status: EventStatus | undefined; onOpen?: () => void }) {
  const now = useServerNow();
  if (!status || now === null) return null;

  if (status.phase === "before") {
    const startsAt = new Date(status.startsAt);
    return (
      <div className="mx-auto mb-3 flex w-fit max-w-full items-center gap-2 rounded-full bg-bonus/10 px-3 py-1.5 text-sm text-zinc-200 ring-1 ring-bonus/40">
        <Lock className="size-3.5 shrink-0 text-bonus" aria-hidden />
        <span className="font-bonus font-bold">Bonus track a las {formatBonusTime(startsAt)}</span>
        <span className="font-bonus-mono text-xs tabular-nums text-bonus" aria-label="Falta">
          {formatCountdown(startsAt.getTime() - now)}
        </span>
      </div>
    );
  }

  if (status.phase === "open") {
    const closesAt = status.closesAt ? new Date(status.closesAt).getTime() : null;
    return (
      <button
        type="button"
        onClick={onOpen}
        className="mb-3 flex w-full items-center gap-3 rounded-xl bg-bonus px-3 py-2 text-left text-white shadow-lg shadow-bonus/20 outline-none transition-transform focus-visible:ring-2 focus-visible:ring-white active:scale-[0.99]"
      >
        <span className="min-w-0 flex-1">
          <span className="block font-bonus text-lg font-extrabold uppercase leading-none tracking-tight">
            Bonus track
          </span>
          <span className="block text-xs text-white/85">Nuevas consignas · puntos x{status.multiplier}</span>
        </span>
        {closesAt !== null && (
          <span className="shrink-0 text-right">
            <span className="block font-bonus-mono text-[0.65rem] uppercase tracking-wider text-white/80">
              Cierra en
            </span>
            <span className="block font-bonus-mono text-lg font-bold leading-none tabular-nums">
              {formatCountdown(closesAt - now)}
            </span>
          </span>
        )}
        <ChevronRight className="size-5 shrink-0 text-white/80" aria-hidden />
      </button>
    );
  }

  return (
    <p className="mb-3 text-center font-bonus-mono text-xs uppercase tracking-wider text-zinc-500">
      Bonus track cerrado
    </p>
  );
}

/**
 * Full-screen "BONUS TRACK" announcement: shown once per guest when the window opens (or when they
 * arrive during it), dismissable, reopened from the banner. Lists the bonus challenges with their
 * points already multiplied; tapping one goes straight to uploading it.
 */
export function BonusTakeover({
  open,
  status,
  challenges,
  onClose,
  onPick,
}: {
  open: boolean;
  status: EventStatus;
  challenges: GuestChallenge[];
  onClose: () => void;
  onPick?: (challengeId: string) => void;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus({ preventScroll: true });
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = overflow;
    };
  }, [open, onClose]);

  if (!open) return null;
  const until = untilLabel(status);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="bonus-takeover-title"
      className="fixed inset-0 z-[60] flex flex-col overflow-y-auto bg-zinc-950 px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(1.5rem,env(safe-area-inset-top))] animate-in fade-in duration-300"
    >
      {/* Accent wash behind the title, so it reads as an event, not a modal. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[45dvh] bg-gradient-to-b from-bonus/35 via-bonus/10 to-transparent"
      />
      <div className="relative mx-auto flex w-full max-w-md flex-1 flex-col">
        <p className="font-bonus-mono text-xs font-bold uppercase tracking-[0.2em] text-bonus">● En vivo</p>
        <h2
          id="bonus-takeover-title"
          className="mt-2 font-bonus text-[clamp(3.25rem,18vw,5.5rem)] font-extrabold uppercase leading-[0.85] tracking-tight text-zinc-50"
        >
          Bonus
          <br />
          track
        </h2>
        <p className="mt-3 font-bonus text-2xl font-bold leading-tight text-zinc-50">
          puntos <span className="text-bonus">x{status.multiplier}</span>
          {until && ` ${until}`}
        </p>
        <p className="mt-1 text-sm text-zinc-400">
          Nuevas consignas, hasta {BONUS_EXTRA_PHOTOS} fotos extra que no gastan tu cupo.
        </p>

        <ul className="mt-6 grid gap-2">
          {challenges.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                disabled={!onPick}
                onClick={() => onPick?.(c.id)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-xl bg-zinc-900 px-3 py-3 text-left ring-1 ring-bonus/40 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-bonus",
                  onPick && "hover:bg-zinc-800 active:scale-[0.99]"
                )}
              >
                <span className="w-14 shrink-0 text-center font-bonus-mono text-2xl font-bold tabular-nums text-bonus">
                  +{c.points}
                </span>
                <span className="min-w-0 flex-1 font-bonus text-base font-bold leading-snug text-zinc-50">
                  {c.label}
                </span>
                {onPick && <ChevronRight className="size-5 shrink-0 text-zinc-500" aria-hidden />}
              </button>
            </li>
          ))}
        </ul>

        <p className="mt-5 rounded-lg border border-dashed border-bonus/50 px-3 py-2 text-center text-sm font-semibold text-zinc-100">
          {BONUS_CONSENT}
        </p>

        <div className="mt-auto pt-6">
          <Button
            ref={closeRef}
            onClick={onClose}
            className="h-14 w-full rounded-xl bg-bonus font-bonus text-lg font-extrabold uppercase tracking-wide text-white hover:bg-bonus/90"
          >
            Dale
          </Button>
        </div>
      </div>
    </div>
  );
}

/** The consent line on the upload screen, when a bonus challenge is picked. */
export function BonusConsent({ className }: { className?: string }) {
  return (
    <p
      className={cn(
        "flex items-center gap-2 rounded-lg bg-bonus/10 px-3 py-2 text-sm font-medium text-zinc-100 ring-1 ring-bonus/40",
        className
      )}
    >
      <HandHeart className="size-4 shrink-0 text-bonus" aria-hidden />
      {BONUS_CONSENT}
    </p>
  );
}
