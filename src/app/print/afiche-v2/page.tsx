import { Camera, Clock, Heart, Trophy } from "lucide-react";
import { PosterQr } from "@/components/print/qr-code";
import { PosterSheet } from "@/components/print/poster-sheet";
import { POSTER_EVENT, posterGame, posterTheme } from "@/lib/poster";
import "./afiche-v2.css";

/** QR side at 9 rows; fewer rows hand their space to the QR instead of leaving gaps. */
const QR_BASE_MM = 140;
const QR_MAX_MM = 168;
const QR_MM_PER_FREED_ROW = 7;
const FULL_BOARD_ROWS = 9;

/**
 * A3 poster v2, a "points board" meant to read from a few meters away: a hero QR, then every
 * challenge ranked by points with a bar to compare them at a glance. Light by default.
 */
export default async function PosterV2Page({ searchParams }: PageProps<"/print/afiche-v2">) {
  const { theme, accent } = posterTheme(await searchParams, "light");
  const game = await posterGame();
  const { maxPhotos, pointsPerLike, closes } = game.facts;

  const rows = game.challenges?.length ?? game.gameRules.length;
  const qrMm = Math.min(
    QR_MAX_MM,
    QR_BASE_MM + Math.max(0, FULL_BOARD_ROWS - rows) * QR_MM_PER_FREED_ROW
  );
  const topPoints = game.challenges?.[0]?.points ?? 1;

  const facts = [
    { icon: Camera, value: String(maxPhotos), label: "fotos máx. por persona" },
    { icon: Heart, value: `+${pointsPerLike}`, label: "punto por like" },
    { icon: Clock, value: closes ?? "Fin", label: "cierre del juego" },
    { icon: Trophy, value: "#1", label: "se lleva el premio" },
  ];

  return (
    <PosterSheet theme={theme} accent={accent} className="poster-v2">
      <header className="v2-header">
        <span>{POSTER_EVENT.shortTagline}</span>
        <span>{POSTER_EVENT.brand}</span>
      </header>

      <h1 className="v2-title">
        Escaneá
        <br />
        <span className="v2-accent">y jugá.</span>
      </h1>

      <div className="v2-qr">
        <PosterQr size={`${qrMm}mm`} caption="Entrás con tu @ de Instagram" />
      </div>

      {game.challenges ? (
        <section className="v2-board" aria-label="Consignas por puntaje">
          <h2 className="v2-label">Consignas · más puntos arriba</h2>
          <ol>
            {game.challenges.map((c) => (
              <li key={c.id}>
                <span className="v2-points">{c.points}</span>
                <span className="v2-challenge">{c.label}</span>
                <span className="v2-bar-track" aria-hidden>
                  <span className="v2-bar" style={{ width: `${(c.points / topPoints) * 100}%` }} />
                </span>
              </li>
            ))}
          </ol>
        </section>
      ) : (
        <section className="v2-board v2-rules" aria-label="Reglas del juego">
          <h2 className="v2-label">Reglas del juego</h2>
          <ol>
            {game.gameRules.map((rule, i) => (
              <li key={rule}>
                <span className="v2-points">{i + 1}</span>
                <span className="v2-challenge">{rule}</span>
              </li>
            ))}
          </ol>
        </section>
      )}

      <section className="v2-facts" aria-label="Reglas">
        {facts.map(({ icon: Icon, value, label }) => (
          <div key={label}>
            <Icon className="v2-icon" strokeWidth={2.25} aria-hidden />
            <strong>{value}</strong>
            <span className="v2-label">{label}</span>
          </div>
        ))}
      </section>

      <footer className="v2-footer">
        <span>¿No te encuentra tu usuario? Avisale a {POSTER_EVENT.host} y te suma.</span>
        <span className="v2-label">Solo invitados</span>
      </footer>
    </PosterSheet>
  );
}
