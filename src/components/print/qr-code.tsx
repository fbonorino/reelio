import { qrPath } from "@/lib/qr";
import { displayUrl, getPublicAppUrl } from "@/lib/public-url";

/**
 * The real, scannable QR to the app on a white plate, with the URL printed below as a fallback.
 * If the public URL isn't configured it renders a loud error instead, so a wrong QR never gets printed.
 */
export function PosterQr({
  size,
  caption,
}: {
  /** Plate width: px as a number, or any CSS length ("140mm"). */
  size: number | string;
  /** Printed on the URL's line, before it. */
  caption?: string;
}) {
  const publicUrl = getPublicAppUrl();

  if ("error" in publicUrl) {
    return (
      <div className="poster-qr poster-qr-error" style={{ width: size }}>
        <strong>No imprimir: el QR no está configurado.</strong>
        <span>{publicUrl.error}</span>
      </div>
    );
  }

  const qr = qrPath(publicUrl.url);
  return (
    <div className="poster-qr" style={{ width: size }}>
      <svg
        viewBox={`0 0 ${qr.size} ${qr.size}`}
        role="img"
        aria-label={`Código QR a ${publicUrl.url}`}
        shapeRendering="crispEdges"
      >
        <rect width={qr.size} height={qr.size} fill="#fff" />
        <path d={qr.d} fill="#000" />
      </svg>
      <span className="poster-qr-url">
        {caption && <span className="poster-qr-caption">{caption} · </span>}
        {displayUrl(publicUrl.url)}
      </span>
    </div>
  );
}
