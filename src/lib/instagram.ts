/** Error `code` from any route that rejects a handle for not being on the guest list. */
export const NOT_INVITED = "NOT_INVITED";

const HANDLE_PATTERN = /^[a-z0-9._]{1,30}$/;

/**
 * Strips spaces, a pasted profile URL (with or without "https://" or "www.") and "@", lowercases.
 * No validation: also used on half-typed searches.
 */
export function cleanInstagramInput(raw: string) {
  return raw
    .replace(/\s+/g, "")
    .replace(/^(https?:\/\/)?(www\.|m\.)?instagram\.com\//i, "")
    .replace(/[/?#].*$/, "")
    .replace(/^@+/, "")
    .toLowerCase();
}

/** `cleanInstagramInput`, then null if it isn't a valid handle. */
export function normalizeInstagram(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const handle = cleanInstagramInput(raw);
  return HANDLE_PATTERN.test(handle) ? handle : null;
}

export function instagramUrl(handle: string) {
  return `https://instagram.com/${encodeURIComponent(handle)}`;
}

/**
 * Canonical profile URL, the form Instagram's app claims as a universal link on phones. Null unless
 * `handle` is already a valid normalized handle: never builds a URL from anything else.
 */
export function instagramProfileUrl(handle: string): string | null {
  return HANDLE_PATTERN.test(handle) ? `https://www.instagram.com/${handle}/` : null;
}
