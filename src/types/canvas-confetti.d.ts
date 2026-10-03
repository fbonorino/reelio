// Minimal typings for the parts of canvas-confetti we use (avoids pulling in @types/canvas-confetti).
declare module "canvas-confetti" {
  export interface Options {
    particleCount?: number;
    angle?: number;
    spread?: number;
    startVelocity?: number;
    decay?: number;
    gravity?: number;
    drift?: number;
    ticks?: number;
    origin?: { x?: number; y?: number };
    colors?: string[];
    scalar?: number;
    zIndex?: number;
    disableForReducedMotion?: boolean;
  }

  export interface Confetti {
    (options?: Options): Promise<null> | null;
    reset(): void;
  }

  const confetti: Confetti;
  export default confetti;
}
