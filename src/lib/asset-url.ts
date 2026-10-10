/** Longest asset URL we store; Cloudinary's are well under 300 characters. */
const MAX_URL_LENGTH = 500;

/**
 * Whether `url` is a delivery URL for an asset in our own Cloudinary cloud, of the given kind:
 * `https://res.cloudinary.com/<cloud>/<image|video>/upload/...`. Anything else (another host, another
 * cloud, credentials, a different scheme) is rejected, so the feed only ever shows our uploads.
 */
export function isOwnCloudinaryUrl(url: unknown, cloudName: string | undefined, type: "IMAGE" | "VIDEO"): boolean {
  if (typeof url !== "string" || !cloudName || url.length > MAX_URL_LENGTH) return false;
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }
  const kind = type === "VIDEO" ? "video" : "image";
  return (
    parsed.protocol === "https:" &&
    parsed.hostname === "res.cloudinary.com" &&
    parsed.port === "" &&
    parsed.username === "" &&
    parsed.password === "" &&
    // Checked on the raw string too: URL() would resolve "/../" segments away before we look.
    url.startsWith(`https://res.cloudinary.com/${cloudName}/${kind}/upload/`) &&
    parsed.pathname.startsWith(`/${cloudName}/${kind}/upload/`) &&
    !url.includes("/../") &&
    !url.includes("\\")
  );
}
