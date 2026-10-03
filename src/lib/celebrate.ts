"use client";

import type { Options } from "canvas-confetti";

const COLORS = ["#fbbf24", "#fde68a", "#f59e0b", "#f472b6", "#818cf8", "#34d399"];

/**
 * Winner confetti: an opening burst, then a gentle rain for a few seconds. `intense` (for the
 * winner themself) adds a second burst from both sides and a longer, heavier rain. Does nothing
 * with prefers-reduced-motion. Returns a function that stops any confetti still to come.
 */
export function celebrate({ intense = false } = {}) {
  if (typeof window === "undefined") return () => {};
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return () => {};

  let stopped = false;
  const timeouts: ReturnType<typeof setTimeout>[] = [];
  let rain: ReturnType<typeof setInterval> | undefined;

  // Loaded on demand: only needed once, when the game closes.
  import("canvas-confetti").then(({ default: confetti }) => {
    if (stopped) return;
    const base: Options = { colors: COLORS, zIndex: 100, disableForReducedMotion: true };

    confetti({ ...base, particleCount: 150, spread: 100, startVelocity: 50, origin: { y: 0.55 } });
    if (intense) {
      timeouts.push(
        setTimeout(() => {
          confetti({ ...base, particleCount: 120, angle: 60, spread: 70, origin: { x: 0, y: 0.7 } });
          confetti({ ...base, particleCount: 120, angle: 120, spread: 70, origin: { x: 1, y: 0.7 } });
        }, 400)
      );
    }

    const rainUntil = Date.now() + (intense ? 6000 : 4000);
    rain = setInterval(() => {
      if (Date.now() > rainUntil) return clearInterval(rain);
      confetti({
        ...base,
        particleCount: intense ? 4 : 2,
        startVelocity: 0,
        gravity: 0.5,
        ticks: 300,
        scalar: 0.9,
        drift: Math.random() - 0.5,
        origin: { x: Math.random(), y: -0.05 },
      });
    }, 200);
  });

  // Confetti already in the air is left to fall; only what's still scheduled is cancelled.
  return () => {
    stopped = true;
    timeouts.forEach(clearTimeout);
    clearInterval(rain);
  };
}
