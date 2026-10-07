import { qrPath } from "@/lib/qr";
import { displayUrl, getPublicAppUrl } from "@/lib/public-url";

/**
 * The real, scannable QR to the app on a white plate, with the URL printed below as a fallback.
 * If the public URL isn't configured it renders a loud error instead, so a wrong QR never gets printed.
 */
export function PosterQr({ size }: { size: number }) {
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
      <span className="poster-qr-url">{displayUrl(publicUrl.url)}</span>
    </div>
  );
}
