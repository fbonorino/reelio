import QRCode from "qrcode";

/** Blank modules around the code, as the QR spec asks for so scanners can find its edges. */
export const QUIET_ZONE = 4;

/**
 * A QR code as one SVG path in module units, quiet zone included. Error correction H: it still
 * scans with ~30% of it damaged — a folded, stained or badly lit poster.
 */
export function qrPath(text: string) {
  const { modules } = QRCode.create(text, { errorCorrectionLevel: "H" });
  const n = modules.size;
  let d = "";
  for (let y = 0; y < n; y++) {
    // One rectangle per horizontal run of dark modules keeps the path short.
    for (let x = 0; x < n; ) {
      if (!modules.get(y, x)) {
        x++;
        continue;
      }
      const start = x;
      while (x < n && modules.get(y, x)) x++;
      d += `M${start + QUIET_ZONE} ${y + QUIET_ZONE}h${x - start}v1h-${x - start}z`;
    }
  }
  return { size: n + QUIET_ZONE * 2, d };
}
