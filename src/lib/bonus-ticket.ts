import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Proof of when a guest's bonus upload started, by the server's clock: issued by /api/quota, which
 * the app calls right before sending the photo to Cloudinary, and checked by POST /api/photos for
 * the grace period after the window closes. Signed so a phone can't backdate it.
 */

function sign(instagram: string, issuedAt: number, secret: string) {
  return createHmac("sha256", secret).update(`bonus:${instagram}:${issuedAt}`).digest("base64url");
}

export function issueBonusTicket(instagram: string, issuedAt: number, secret: string) {
  return `${issuedAt}.${sign(instagram, issuedAt, secret)}`;
}

/** The server time the ticket was issued at, or null if it's missing, malformed or not this guest's. */
export function readBonusTicket(ticket: unknown, instagram: string, secret: string): number | null {
  if (typeof ticket !== "string" || !secret) return null;
  const [rawTime, signature] = ticket.split(".");
  const issuedAt = Number(rawTime);
  if (!Number.isSafeInteger(issuedAt) || !signature) return null;
  const expected = Buffer.from(sign(instagram, issuedAt, secret));
  const given = Buffer.from(signature);
  return given.length === expected.length && timingSafeEqual(given, expected) ? issuedAt : null;
}
