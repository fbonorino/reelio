import { Camera, CircleHelp, ListChecks, Upload } from "lucide-react";
import { PosterQr } from "@/components/print/qr-code";
import { PosterSheet } from "@/components/print/poster-sheet";
import { POSTER_EVENT, posterGame, posterTheme } from "@/lib/poster";
// Header, title and QR plate are poster v2's (all scoped to .poster-v2); this adds the rules blocks.
import "../afiche-v2/afiche-v2.css";
import "./afiche-reglas.css";

const STEP_ICONS = [ListChecks, Camera, Upload];

/**
 * A3 poster with the rules only: no challenges or their points, which guests discover in the app.
 * Light by default. Every rule's wording comes from (await posterGame()).posterRules.
 */
export default async function RulesPosterPage({ searchParams }: PageProps<"/print/afiche-reglas">) {
  const { theme, accent } = posterTheme(await searchParams, "light");
  const rules = (await posterGame()).posterRules;

  return (
    <PosterSheet theme={theme} accent={accent} className="poster-v2 poster-reglas">
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
        <PosterQr size="146mm" caption="Entrás con tu @ de Instagram" />
      </div>

      <div className="rg-body">
        <section aria-label="Cómo se juega">
          <h2 className="v2-label">Cómo se juega</h2>
          <ol className="rg-steps">
            {rules.steps.map((step, i) => {
              const Icon = STEP_ICONS[i];
              return (
                <li key={step}>
                  <span className="rg-step-num">{i + 1}</span>
                  {Icon && <Icon className="rg-step-icon" strokeWidth={2.25} aria-hidden />}
                  <span className="rg-step-word">{step}.</span>
                </li>
              );
            })}
          </ol>
        </section>

        <ul className="rg-tiles">
          {rules.tiles.map((tile) => (
            <li key={tile.label}>
              <strong>{tile.value}</strong>
              <span>{tile.label}</span>
            </li>
          ))}
        </ul>

        <section className="rg-strip">
          <strong>{rules.prize}</strong>
          <span>{rules.invalid}</span>
        </section>

        <p className="rg-hook">
          <CircleHelp className="rg-hook-icon" strokeWidth={2.25} aria-hidden />
          {rules.hook}
        </p>
      </div>

      <footer className="v2-footer">
        <span>¿No te encuentra tu usuario? Avisale a {POSTER_EVENT.host} y te suma.</span>
        <span className="v2-label">Solo invitados</span>
      </footer>
    </PosterSheet>
  );
}
