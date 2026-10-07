/** Hosts a phone at the party can't reach: a QR pointing at one of these would be useless. */
const LOCAL_HOST = /^(localhost|127\.|0\.0\.0\.0|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|\[::1\])|\.local$/i;

/**
 * The public production URL guests open, from PUBLIC_APP_URL, else Vercel's own
 * VERCEL_PROJECT_PRODUCTION_URL. Never a hardcoded or local fallback: posters show an error instead.
 */
export function getPublicAppUrl(): { url: string } | { error: string } {
  const vercelHost = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  const raw = process.env.PUBLIC_APP_URL || (vercelHost ? `https://${vercelHost}` : "");
  if (!raw) return { error: "Falta PUBLIC_APP_URL (la URL pública de producción)." };

  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return { error: `PUBLIC_APP_URL no es una URL válida: ${raw}` };
  }
  if (url.protocol !== "https:" || LOCAL_HOST.test(url.hostname)) {
    return { error: `PUBLIC_APP_URL tiene que ser la URL pública con https, no ${url.origin}.` };
  }
  return { url: url.href };
}

/** For printing next to the QR: no scheme, no trailing slash. */
export function displayUrl(url: string) {
  return url.replace(/^https?:\/\//, "").replace(/\/$/, "");
}
