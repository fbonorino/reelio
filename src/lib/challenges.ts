export type Challenge = {
  id: string;
  label: string;
  points: number;
  menOnly?: boolean;
};

// Ordered from easiest to hardest. Ids are stored in the DB — don't rename them.
export const CHALLENGES: Challenge[] = [
  { id: "chicle", label: "Foto globo con chicle", points: 4 },
  { id: "pelado", label: "Foto con un pelado", points: 7 },
  { id: "vaso", label: "Foto haciendo equilibrio con un vaso en la cabeza", points: 10 },
  { id: "piso", label: "Foto acostado en el piso del boliche", points: 14 },
  { id: "zapato", label: "Foto con el zapato de un desconocido", points: 18 },
  { id: "patova", label: "Foto abrazando un patova", points: 22 },
  { id: "desconocidas", label: "Selfie con +5 desconocid@s", points: 28, menOnly: true },
  { id: "colorado", label: "Foto besándole la frente a un/a colorad@", points: 32 },
  { id: "propuesta", label: "Foto propuesta de matrimonio", points: 42 },
];

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

/** Only challenges that can still be picked for a new upload. */
export function getChallenge(id: string): Challenge | undefined {
  return CHALLENGES.find((c) => c.id === id);
}

/** Label for any challenge a stored photo may reference, retired ones included. */
export function getChallengeLabel(id: string): string | undefined {
  return (getChallenge(id) ?? RETIRED_CHALLENGES.find((c) => c.id === id))?.label;
}
