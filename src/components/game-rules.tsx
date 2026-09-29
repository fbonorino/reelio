import { MAX_PHOTOS_PER_USER } from "@/lib/challenges";
import { getEventEnd } from "@/lib/event";

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
  { emoji: "🌙", text: `Después de ${endTimeLabel()} se cierra el juego, pero podés seguir subiendo fotos como recuerdo — esas ya no suman puntos.` },
];

/** "Cómo se juega" rules — shared by onboarding and the side panel. */
export function GameRules() {
  return (
    <ul className="space-y-3 text-sm text-zinc-200">
      {RULES.map((rule) => (
        <li key={rule.emoji} className="flex gap-3">
          <span className="text-lg leading-5">{rule.emoji}</span>
          <span>{rule.text}</span>
        </li>
      ))}
    </ul>
  );
}
