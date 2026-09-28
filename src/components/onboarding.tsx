"use client";

import { useState } from "react";
import { AtSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { normalizeInstagram } from "@/lib/instagram";
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
 * Blocking first-run flow: rules, challenges, then Instagram handle. The first two steps
 * are skipped once seen. Renders nothing once a handle is saved.
 */
export function Onboarding({ open }: { open: boolean }) {
  const [step, setStep] = useState<Step>(() => (readIntroSeen() ? "handle" : "rules"));
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const handle = normalizeInstagram(value);
    if (!handle) {
      setError("Ese usuario no parece válido (letras, números, puntos y guiones bajos).");
      return;
    }
    saveInstagram(handle);
  }

  return (
    <Dialog open={open}>
      <DialogContent
        showCloseButton={false}
        onEscapeKeyDown={(e) => e.preventDefault()}
        onPointerDownOutside={(e) => e.preventDefault()}
        className="max-h-[90dvh] overflow-y-auto border-zinc-800 bg-zinc-900 text-zinc-100 sm:max-w-md"
      >
        {step === "rules" ? (
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
                Va a aparecer en tus fotos y en el ranking. Lo cargás una sola vez.
              </DialogDescription>
            </DialogHeader>
            <div className="relative">
              <AtSign className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-500" />
              <Input
                autoFocus
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                placeholder="tu.usuario"
                value={value}
                onChange={(e) => {
                  setValue(e.target.value);
                  setError(null);
                }}
                maxLength={60}
                className="border-zinc-700 bg-zinc-950 pl-9"
              />
            </div>
            {error && <p className="text-sm text-rose-400">{error}</p>}
            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setStep("challenges")}
                className="text-zinc-400"
              >
                Volver
              </Button>
              <Button
                type="submit"
                disabled={!value.trim()}
                className="bg-indigo-600 hover:bg-indigo-500"
              >
                Empezar a jugar
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
