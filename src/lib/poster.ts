import { CHALLENGES_BY_POINTS, MAX_PHOTOS_PER_USER } from "@/lib/challenges";
import { getEventEnd } from "@/lib/event";
import { PRIZE_LABEL } from "@/lib/prize";

/** The party itself; nothing in the app needs these, only the printed posters. */
export const POSTER_EVENT = {
  tagline: "FRAN 25 · SÁB 10.10 · PREVIA 23 HS",
  brand: "REELIO",
  bigNumber: "25",
  host: "Franco",
};

/** Same zone as NEXT_PUBLIC_EVENT_END_TIME's offset, so the server prints the party's local time. */
const EVENT_TIME_ZONE = "America/Argentina/Buenos_Aires";

/** "4 AM", or "4:30 AM", from the real end time. Null when the game has no end time set. */
function closingTime() {
  const end = getEventEnd();
  if (!end) return null;
  const minutes = end.getUTCMinutes();
  return end.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: minutes ? "2-digit" : undefined,
    timeZone: EVENT_TIME_ZONE,
  });
}

/** How many challenge cards fit on the A3 poster (a 3×3 grid). */
const POSTER_CHALLENGE_SLOTS = 9;

/** Everything the posters say about the game, read from the same config the app enforces. */
export function posterGame() {
  const closes = closingTime();
  return {
    // All of them or none: a partial list would read as the whole game.
    challenges:
      CHALLENGES_BY_POINTS.length <= POSTER_CHALLENGE_SLOTS ? CHALLENGES_BY_POINTS : null,
    // Shown instead of the challenges when they don't fit.
    gameRules: [
      "Elegí una consigna, cumplila y subí la foto que lo demuestre.",
      `Tenés ${MAX_PHOTOS_PER_USER} fotos en total: pensá bien en qué consignas las gastás.`,
      "Cada like que te den en tus fotos es +1 punto.",
      "Si la foto no cumple la consigna, perdés esos puntos.",
      `${closes ? `A las ${closes}` : "Al final de la noche"} se cierra el juego y gana el que tenga más puntos.`,
    ],
    rules: [
      `máx. ${MAX_PHOTOS_PER_USER} fotos por persona`,
      "los likes suman",
      closes ? `hasta las ${closes}` : "hasta el cierre",
      PRIZE_LABEL,
    ],
  };
}

/** `?theme=light` prints black on white to save ink; `?accent=ff5a36` swaps the accent color. */
export function posterTheme(params: { theme?: string | string[]; accent?: string | string[] }) {
  const accent = typeof params.accent === "string" ? params.accent.replace(/^#/, "") : "";
  return {
    theme: params.theme === "light" ? "light" : "dark",
    accent: /^[0-9a-f]{3}([0-9a-f]{3})?$/i.test(accent) ? `#${accent}` : undefined,
  } as const;
}
