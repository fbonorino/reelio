"use client";

import { useRef, useState } from "react";
import { Info, ListChecks, Users } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ChallengeList, type Pickable } from "@/components/challenge-list";
import { GameRules } from "@/components/game-rules";
import { GuestList } from "@/components/guest-list";
import { useGuests } from "@/hooks/use-guests";
import { useInstagram } from "@/lib/profile";

type Panel = "rules" | "challenges" | "guests";

const BUTTONS = [
  { panel: "rules", icon: Info, label: "Cómo se juega" },
  { panel: "challenges", icon: ListChecks, label: "Consignas" },
  { panel: "guests", icon: Users, label: "Invitados" },
] as const;

const TITLES: Record<Panel, { title: string; description: string }> = {
  rules: { title: "Cómo se juega", description: "Reglas del juego" },
  challenges: { title: "Consignas", description: "Las consignas del juego" },
  guests: { title: "Invitados", description: "Los invitados que ya entraron a Reelio" },
};

/**
 * Narrow icon rail fixed to the left edge, opening rules / challenges / guests in a slide-over from that side.
 * `onPickChallenge` adds a "Subir esta" button per challenge; omit it when uploading isn't possible.
 */
export function InfoRail({
  onPickChallenge,
  pickable,
}: {
  onPickChallenge?: (challengeId: string) => void;
  pickable?: Pickable;
}) {
  const [open, setOpen] = useState(false);
  // Kept after closing so the content doesn't swap during the exit animation.
  const [panel, setPanel] = useState<Panel>("rules");
  const instagram = useInstagram();
  const guests = useGuests(instagram, open && panel === "guests");
  const contentRef = useRef<HTMLDivElement>(null);

  return (
    <>
      {/* Lower third: reachable one-handed, and above the centered "Subir consigna" button. On the left
          edge because each card's like button sits at its bottom-right: on the right, the rail covered
          the right-hand card's like at some scroll position on every phone width. */}
      <nav className="fixed bottom-[calc(10rem+env(safe-area-inset-bottom))] left-[env(safe-area-inset-left)] z-40 flex flex-col gap-1 rounded-r-2xl border border-l-0 border-zinc-700 bg-zinc-900/85 p-1 shadow-lg shadow-black/40 backdrop-blur">
        {BUTTONS.map(({ panel: p, icon: Icon, label }) => (
          <button
            key={p}
            onClick={() => {
              setPanel(p);
              setOpen(true);
            }}
            aria-label={label}
            className="flex size-11 items-center justify-center rounded-xl text-zinc-300 transition-colors hover:bg-zinc-800 hover:text-zinc-50 active:scale-95 active:bg-zinc-800"
          >
            <Icon className="size-5" />
          </button>
        ))}
      </nav>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          ref={contentRef}
          side="left"
          // The guests panel opens with its search box first: focusing it would pop the keyboard on phones.
          onOpenAutoFocus={(e) => {
            if (panel !== "guests") return;
            e.preventDefault();
            contentRef.current?.focus();
          }}
          className="w-[88%] gap-0 border-zinc-800 bg-zinc-900 text-zinc-100 outline-none sm:max-w-md"
        >
          <SheetHeader className="pr-14 pt-[max(1rem,env(safe-area-inset-top))]">
            <div className="flex items-baseline gap-3">
              <SheetTitle className="font-display text-2xl uppercase tracking-wide text-zinc-50">
                {TITLES[panel].title}
              </SheetTitle>
              {panel === "guests" && guests.data && (
                <span className="text-sm tabular-nums text-zinc-400">{guests.data.length} adentro</span>
              )}
            </div>
            <SheetDescription className="sr-only">{TITLES[panel].description}</SheetDescription>
          </SheetHeader>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-[max(1.5rem,calc(env(safe-area-inset-bottom)+1rem))]">
            {panel === "rules" ? (
              <GameRules />
            ) : panel === "guests" ? (
              <GuestList handles={guests.data} error={!!guests.error} />
            ) : (
              <ChallengeList
                pickable={pickable}
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
