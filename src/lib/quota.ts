import { FREE_PHOTO, MAX_FREE_PHOTOS_PER_USER, MAX_PHOTOS_PER_USER } from "./challenges.ts";
import { BONUS_EXTRA_PHOTOS } from "./bonus.ts";

/** Each kind of photo has its own cap: challenge photos, "Foto libre" and bonus track photos. */
export type PhotoKind = "challenge" | "free" | "bonus";

export const PHOTO_LIMITS: Record<PhotoKind, number> = {
  challenge: MAX_PHOTOS_PER_USER,
  free: MAX_FREE_PHOTOS_PER_USER,
  bonus: BONUS_EXTRA_PHOTOS,
};

type StoredPhoto = { challengeId: string; isBonus: boolean };

export function photoKind(photo: StoredPhoto): PhotoKind {
  if (photo.challengeId === FREE_PHOTO.id) return "free";
  return photo.isBonus ? "bonus" : "challenge";
}

/** How many photos of each kind a guest has uploaded. */
export function tallyPhotos(photos: StoredPhoto[]): Record<PhotoKind, number> {
  const tally = { challenge: 0, free: 0, bonus: 0 };
  for (const photo of photos) tally[photoKind(photo)] += 1;
  return tally;
}

/**
 * Why a guest with `photos` can't upload one more for `challengeId` (of `kind`), or null if they can.
 * `limit: true` means they're out of room for that kind altogether.
 */
export function quotaError(
  kind: PhotoKind,
  challengeId: string,
  photos: StoredPhoto[]
): { error: string; limit: boolean } | null {
  if (tallyPhotos(photos)[kind] >= PHOTO_LIMITS[kind]) {
    const error = {
      challenge: `Ya subiste tus ${MAX_PHOTOS_PER_USER} fotos de consignas`,
      free: `Ya subiste tus ${MAX_FREE_PHOTOS_PER_USER} fotos libres`,
      bonus: `Ya subiste tus ${BONUS_EXTRA_PHOTOS} fotos del bonus track`,
    }[kind];
    return { error, limit: true };
  }
  // Regular challenges can repeat; each bonus challenge counts once per guest.
  if (kind === "bonus" && photos.some((p) => p.challengeId === challengeId)) {
    return { error: "Ya subiste una foto para esa consigna bonus", limit: false };
  }
  return null;
}
