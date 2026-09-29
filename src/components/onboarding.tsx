"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ChallengeList } from "@/components/challenge-list";
import { GameRules } from "@/components/game-rules";
import { GuestPicker } from "@/components/guest-picker";
import { GameOverNotice } from "@/components/winner-banner";
import { useEventEnded } from "@/hooks/use-event-ended";
import { saveInstagram } from "@/lib/profile";

const INTRO_SEEN_KEY = "reelio_intro_seen";

function readIntroSeen() {
  try {
    return localStorage.getItem(INTRO_SEEN_KEY) === "1";
  } catch {
    return false;
  }
}

function markIntroSeen() {
  try {
    localStorage.setItem(INTRO_SEEN_KEY, "1");
  } catch {
    // Private mode — they'll just see the intro again next time.
  }
}

type Step = "rules" | "challenges" | "handle";

/**
 * Blocking first-run flow: rules, challenges, then picking your handle from the guest list.
 * The first two steps are skipped once seen. Reopens if the saved handle is removed from the list.
 */
export function Onboarding({ open }: { open: boolean }) {
  const [step, setStep] = useState<Step>(() => (readIntroSeen() ? "handle" : "rules"));
  // Only ever set by picking a match from the guest list.
  const [handle, setHandle] = useState<string | null>(null);
  const ended = useEventEnded();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (handle) saveInstagram(handle);
  }

  return (
    <Dialog open={open}>
      <DialogContent
        showCloseButton={false}
        onEscapeKeyDown={(e) => e.preventDefault()}
        onPointerDownOutside={(e) => e.preventDefault()}
        className="max-h-[90dvh] overflow-y-auto border-zinc-800 bg-zinc-900 text-zinc-100 sm:max-w-md"
      >
        {step === "rules" && ended ? (
          <>
            <DialogHeader>
              <DialogTitle className="font-display text-2xl uppercase tracking-wide">
                Se terminó el juego
              </DialogTitle>
              <DialogDescription className="sr-only">El juego terminó</DialogDescription>
            </DialogHeader>
            <GameOverNotice />
            <DialogFooter>
              <Button
                onClick={() => {
                  // The challenge list is all about points, so skip straight to picking a handle.
                  markIntroSeen();
                  setStep("handle");
                }}
                className="w-full bg-indigo-600 hover:bg-indigo-500"
              >
                Siguiente
              </Button>
            </DialogFooter>
          </>
        ) : step === "rules" ? (
          <>
            <DialogHeader>
              <DialogTitle className="font-display text-2xl uppercase tracking-wide">
                Cómo se juega
              </DialogTitle>
              <DialogDescription className="text-zinc-400">
                Leé esto antes de arrancar, que después no hay reclamos.
              </DialogDescription>
            </DialogHeader>
            <GameRules />
            <DialogFooter>
              <Button
                onClick={() => setStep("challenges")}
                className="w-full bg-indigo-600 hover:bg-indigo-500"
              >
                Siguiente
              </Button>
            </DialogFooter>
          </>
        ) : step === "challenges" ? (
          <>
            <DialogHeader>
              <DialogTitle className="font-display text-2xl uppercase tracking-wide">
                Las consignas
              </DialogTitle>
              <DialogDescription className="text-zinc-400">
                Andá pensando cuáles vas a hacer. Las tenés siempre a mano en la barra de la derecha.
              </DialogDescription>
            </DialogHeader>
            <ChallengeList />
            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setStep("rules")}
                className="text-zinc-400"
              >
                Volver
              </Button>
              <Button
                onClick={() => {
                  markIntroSeen();
                  setStep("handle");
                }}
                className="bg-indigo-600 hover:bg-indigo-500"
              >
                Siguiente
              </Button>
            </DialogFooter>
          </>
        ) : (
          <form onSubmit={handleSubmit} className="grid gap-4">
            <DialogHeader>
              <DialogTitle className="font-display text-2xl uppercase tracking-wide">
                ¿Cuál es tu Instagram?
              </DialogTitle>
              <DialogDescription className="text-zinc-400">
                Buscate en la lista de invitados.{" "}
                {ended ? "Va a aparecer en tus fotos." : "Va a aparecer en tus fotos y en el ranking."}
              </DialogDescription>
            </DialogHeader>
            <GuestPicker value={handle} onChange={setHandle} />
            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setStep(ended ? "rules" : "challenges")}
                className="text-zinc-400"
              >
                Volver
              </Button>
              <Button
                type="submit"
                disabled={!handle}
                className="bg-indigo-600 hover:bg-indigo-500"
              >
                {ended ? "Entrar" : "Empezar a jugar"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
