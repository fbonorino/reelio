/** A challenge guests can pick. Managed from /host and stored in the DB (see challenges-db.ts). */
export type Challenge = {
  id: string;
  label: string;
  points: number;
};

/** Longest challenge label the host can save; the poster and the guest list are laid out for short ones. */
export const MAX_CHALLENGE_LABEL = 120;

/** Highest points one challenge can be worth. */
export const MAX_CHALLENGE_POINTS = 999;

export const MAX_PHOTOS_PER_USER = 5;

/** Each like a game photo receives adds this to its uploader's score. */
export const POINTS_PER_LIKE = 1;

/**
 * "Foto libre": any photo of the night, open during and after the game. Never scores: no
 * challenge points, and its likes count for nobody. Has its own cap, separate from the
 * challenge photos'. Stored as a photo with this `challengeId`.
 */
export const FREE_PHOTO = {
  id: "libre",
  label: "Foto libre",
  hint: "Cualquier foto de la noche",
} as const;

export const MAX_FREE_PHOTOS_PER_USER = 10;

export function isFreePhoto(challengeId: string) {
  return challengeId === FREE_PHOTO.id;
}
