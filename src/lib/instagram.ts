const HANDLE_PATTERN = /^[a-z0-9._]{1,30}$/;

/** Strips "@", spaces and a pasted profile URL, lowercases. Returns null if it isn't a valid handle. */
export function normalizeInstagram(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const handle = raw
    .trim()
    .replace(/^https?:\/\/(www\.)?instagram\.com\//i, "")
    .replace(/[/?].*$/, "")
    .replace(/^@+/, "")
    .toLowerCase();
  return HANDLE_PATTERN.test(handle) ? handle : null;
}

export function instagramUrl(handle: string) {
  return `https://instagram.com/${encodeURIComponent(handle)}`;
}
