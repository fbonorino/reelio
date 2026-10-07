export type Challenge = {
  id: string;
  label: string;
  points: number;
};

// Ordered from easiest to hardest. Ids are stored in the DB — don't rename them.
export const CHALLENGES: Challenge[] = [
  { id: "chicle", label: "Foto globo con chicle", points: 4 },
  { id: "pelado", label: "Foto con un pelado", points: 7 },
  { id: "vaso", label: "Foto haciendo equilibrio con un vaso en la cabeza", points: 10 },
  { id: "piso", label: "Foto acostado en el piso del boliche", points: 28 },
  { id: "zapato", label: "Foto con el zapato de un desconocido", points: 18 },
  { id: "patova", label: "Foto abrazando un patova", points: 22 },
  { id: "desconocidas", label: "Selfie con +5 desconocid@s", points: 14 },
  { id: "colorado", label: "Foto besándole la frente a un/a colorad@", points: 42 },
  { id: "propuesta", label: "Foto propuesta de matrimonio", points: 32 },
];

/** How challenges are shown to guests: most points first. */
export const CHALLENGES_BY_POINTS = [...CHALLENGES].sort((a, b) => b.points - a.points);

/**
 * No longer offered, but photos already uploaded with them keep their id and point snapshot,
 * so their labels are still needed for display and export.
 */
const RETIRED_CHALLENGES: Pick<Challenge, "id" | "label">[] = [
  { id: "dj", label: "Foto con el DJ" },
  { id: "cumpleanero", label: "Foto con el cumpleañero" },
  { id: "labios", label: "Foto pintándose los labios" },
];

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

/** Only challenges that can still be picked for a new upload. */
export function getChallenge(id: string): Challenge | undefined {
  return CHALLENGES.find((c) => c.id === id);
}

/** Label for any challenge a stored photo may reference, retired ones and "Foto libre" included. */
export function getChallengeLabel(id: string): string | undefined {
  if (isFreePhoto(id)) return FREE_PHOTO.label;
  return (getChallenge(id) ?? RETIRED_CHALLENGES.find((c) => c.id === id))?.label;
}
