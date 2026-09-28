"use client";

import { useState } from "react";
import { Info, ListChecks } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ChallengeList } from "@/components/challenge-list";
import { GameRules } from "@/components/game-rules";

type Panel = "rules" | "challenges";

const BUTTONS = [
  { panel: "rules", icon: Info, label: "Cómo se juega" },
  { panel: "challenges", icon: ListChecks, label: "Consignas" },
] as const;

/**
 * Narrow icon rail fixed to the right edge, opening rules / challenges in a slide-over.
 * `onPickChallenge` adds a "Subir esta" button per challenge; omit it when uploading isn't possible.
 */
export function InfoRail({ onPickChallenge }: { onPickChallenge?: (challengeId: string) => void }) {
  const [open, setOpen] = useState(false);
  // Kept after closing so the content doesn't swap during the exit animation.
  const [panel, setPanel] = useState<Panel>("rules");

  return (
    <>
      {/* Lower third: reachable one-handed, and above the centered "Subir consigna" button. */}
      <nav className="fixed bottom-40 right-0 z-40 flex flex-col gap-1 rounded-l-2xl border border-r-0 border-zinc-700 bg-zinc-900/85 p-1 shadow-lg shadow-black/40 backdrop-blur">
        {BUTTONS.map(({ panel: p, icon: Icon, label }) => (
          <button
            key={p}
            onClick={() => {
              setPanel(p);
              setOpen(true);
            }}
            aria-label={label}
            className="flex size-10 items-center justify-center rounded-xl text-zinc-300 transition-colors hover:bg-zinc-800 hover:text-zinc-50 active:scale-95"
          >
            <Icon className="size-5" />
          </button>
        ))}
      </nav>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="w-[88%] gap-0 border-zinc-800 bg-zinc-900 text-zinc-100 sm:max-w-md">
          {panel === "rules" ? (
            <SheetHeader className="pr-12">
              <SheetTitle className="font-display text-2xl uppercase tracking-wide text-zinc-50">
                Cómo se juega
              </SheetTitle>
              <SheetDescription className="sr-only">Reglas del juego</SheetDescription>
            </SheetHeader>
          ) : (
            <SheetHeader className="pr-12">
              <SheetTitle className="font-display text-2xl uppercase tracking-wide text-zinc-50">
                Consignas
              </SheetTitle>
              <SheetDescription className="text-zinc-400">
                Ordenadas de más a menos puntos.
              </SheetDescription>
            </SheetHeader>
          )}
          <div className="flex-1 overflow-y-auto px-4 pb-6">
            {panel === "rules" ? (
              <GameRules />
            ) : (
              <ChallengeList
                onPick={
                  onPickChallenge &&
                  ((id) => {
                    setOpen(false);
                    onPickChallenge(id);
                  })
                }
              />
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
