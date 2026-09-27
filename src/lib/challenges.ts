export type Challenge = {
  id: string;
  label: string;
  points: number;
  menOnly?: boolean;
};

// Ordered from easiest to hardest. Ids are stored in the DB — don't rename them.
export const CHALLENGES: Challenge[] = [
  { id: "dj", label: "Foto con el DJ", points: 3 },
  { id: "chicle", label: "Foto globo con chicle", points: 5 },
  { id: "pelado", label: "Foto con un pelado", points: 8 },
  { id: "vaso", label: "Foto haciendo equilibrio con un vaso en la cabeza", points: 10 },
  { id: "cumpleanero", label: "Foto con el cumpleañero", points: 12 },
  { id: "piso", label: "Foto acostado en el piso del boliche", points: 15 },
  { id: "labios", label: "Foto pintándose los labios", points: 18, menOnly: true },
  { id: "patova", label: "Foto con un patova abrazándose", points: 22 },
  { id: "desconocidas", label: "Selfie con +5 desconocidas", points: 28, menOnly: true },
  { id: "colorado", label: "Foto besándole la frente a un/a colorad@", points: 32 },
];

export const MAX_PHOTOS_PER_USER = 5;

export function getChallenge(id: string): Challenge | undefined {
  return CHALLENGES.find((c) => c.id === id);
}
