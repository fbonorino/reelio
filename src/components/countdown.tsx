"use client";

import { useEffect, useState } from "react";
import { Timer } from "lucide-react";
import { useEventEnded } from "@/hooks/use-event-ended";
import { getEventEnd } from "@/lib/event";

const eventEnd = getEventEnd();

function formatRemaining(ms: number) {
  const totalMinutes = Math.ceil(ms / 60_000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return hours > 0 ? `${hours} h ${minutes} min` : `${minutes} min`;
}

export function Countdown() {
  const [now, setNow] = useState<number | null>(null);
  const ended = useEventEnded();

  useEffect(() => {
    if (!eventEnd) return;
    const tick = () => setNow(Date.now());
    tick();
    const interval = setInterval(tick, 15_000);
    return () => clearInterval(interval);
  }, []);

  // `now` is null until mounted, which avoids a server/client time mismatch.
  if (!eventEnd || now === null) return null;

  const remaining = eventEnd.getTime() - now;

  return (
    <div className="mb-3 flex items-center justify-center gap-1.5 text-sm font-medium">
      <Timer className="size-4 text-amber-400" />
      {!ended && remaining > 0 ? (
        <span className="text-zinc-300">
          Termina en <span className="text-amber-400">{formatRemaining(remaining)}</span>
        </span>
      ) : (
        <span className="text-amber-400">¡Se terminó el juego! Mirá el ranking final 🏆</span>
      )}
    </div>
  );
}
