import { Fragment } from "react";
import { PosterQr } from "@/components/print/qr-code";
import { PosterSheet } from "@/components/print/poster-sheet";
import { POSTER_EVENT, posterGame, posterTheme } from "@/lib/poster";

const STEPS = [
  { title: "Escaneá el QR", text: "Entrás con tu @ de Instagram, sin contraseña." },
  {
    title: "Elegí una consigna",
    text: "Cada una vale distinto puntaje. Después subí tu foto o video.",
  },
  { title: "Juntá likes", text: "Cada like de otro invitado suma puntos extra." },
];

/** A3 poster: QR, how to play, the top challenges and the rules. */
export default async function PosterPage({ searchParams }: PageProps<"/print/afiche">) {
  const { theme, accent } = posterTheme(await searchParams);
  const game = await posterGame();

  return (
    <PosterSheet theme={theme} accent={accent} className="poster-main">
      <span className="poster-bignum" aria-hidden>
        {POSTER_EVENT.bigNumber}
      </span>

      <header className="poster-header">
        <span className="poster-mono">{POSTER_EVENT.tagline}</span>
        <span className="poster-mono">{POSTER_EVENT.brand}</span>
      </header>

      <h1 className="poster-title">
        Subí fotos.
        <br />
        Sumá puntos.
        <br />
        <span className="poster-accent">Ganá la noche.</span>
      </h1>

      <section className="poster-play">
        <PosterQr size={360} />
        <div className="poster-steps">
          <h2 className="poster-mono poster-muted">Cómo se juega</h2>
          <ol>
            {STEPS.map((step, i) => (
              <li key={step.title}>
                <span className="poster-step-num">{i + 1}</span>
                <div>
                  <strong>{step.title}</strong>
                  <p>{step.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {game.challenges ? (
        <section className="poster-challenges">
          <h2 className="poster-mono poster-muted">Consignas</h2>
          <ul>
            {game.challenges.map((c) => (
              <li key={c.id}>
                <span className="poster-challenge-label">{c.label}</span>
                <span className="poster-challenge-points">
                  {c.points}
                  <small className="poster-mono">pts</small>
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <section className="poster-rules">
          <h2 className="poster-mono poster-muted">Reglas del juego</h2>
          <ul>
            {game.gameRules.map((rule) => (
              <li key={rule}>{rule}</li>
            ))}
          </ul>
        </section>
      )}

      <section className="poster-strip poster-mono">
        {game.rules.map((rule, i) => (
          <Fragment key={rule}>
            {i > 0 && <span aria-hidden>·</span>}
            <span>{rule}</span>
          </Fragment>
        ))}
      </section>

      <footer className="poster-footer">
        <span>¿No te encuentra tu usuario? Avisale a {POSTER_EVENT.host} y te suma.</span>
        <span className="poster-mono">Solo invitados</span>
      </footer>
    </PosterSheet>
  );
}
