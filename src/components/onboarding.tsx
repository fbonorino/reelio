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
import { MAX_PHOTOS_PER_USER } from "@/lib/challenges";
import { getEventEnd } from "@/lib/event";
import { normalizeInstagram } from "@/lib/instagram";
import { saveInstagram } from "@/lib/profile";

function endTimeLabel() {
  const end = getEventEnd();
  if (!end) return "el final de la noche";
  return `las ${end.toLocaleTimeString("es-AR", { hour: "numeric", minute: "2-digit" })}`;
}

const RULES = [
  { emoji: "⏰", text: `Tenés hasta ${endTimeLabel()} para sumar puntos. Después se cierra el juego.` },
  { emoji: "📸", text: "Elegí una consigna, cumplila y subí la foto que lo demuestre. Cada consigna suma puntos." },
  { emoji: "🖐️", text: `Tenés ${MAX_PHOTOS_PER_USER} fotos en total — pensá bien en qué consignas las gastás.` },
  { emoji: "❤️", text: "Cada like que te den los demás en tus fotos es +1 punto extra." },
  { emoji: "🕵️", text: "Si la foto no cumple la consigna que elegiste, perdés esos puntos... y tenés que tomar un shot 🍻" },
  { emoji: "🏆", text: "El que más puntos tenga al final de la noche se lleva un premio. Tranquilo, NO es un beso con el cumpleañero." },
];

/** Blocking first-run flow: rules, then Instagram handle. Renders nothing once a handle is saved. */
export function Onboarding({ open }: { open: boolean }) {
  const [step, setStep] = useState<"rules" | "handle">("rules");
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
            <ul className="space-y-3 text-sm text-zinc-200">
              {RULES.map((rule) => (
                <li key={rule.emoji} className="flex gap-3">
                  <span className="text-lg leading-5">{rule.emoji}</span>
                  <span>{rule.text}</span>
                </li>
              ))}
            </ul>
            <DialogFooter>
              <Button
                onClick={() => setStep("handle")}
                className="w-full bg-indigo-600 hover:bg-indigo-500"
              >
                Dale, entendido
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
                onClick={() => setStep("rules")}
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
