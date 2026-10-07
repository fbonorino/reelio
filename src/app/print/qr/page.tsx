import { PosterQr } from "@/components/print/qr-code";
import { PosterSheet } from "@/components/print/poster-sheet";
import { posterTheme } from "@/lib/poster";

/** A3 poster with just a giant QR, for walls where the rules poster would be too much to read. */
export default async function QrPosterPage({ searchParams }: PageProps<"/print/qr">) {
  const { theme, accent } = posterTheme(await searchParams);

  return (
    <PosterSheet theme={theme} accent={accent} className="poster-qr-only">
      <h1 className="poster-title poster-title-qr">
        Escaneá
        <br />
        <span className="poster-accent">y jugá.</span>
      </h1>

      <PosterQr size={620} />

      <footer className="poster-footer">
        <span>Entrás con tu @ de Instagram</span>
        <span className="poster-mono">Subí fotos · Sumá puntos</span>
      </footer>
    </PosterSheet>
  );
}
