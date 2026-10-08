import { prisma } from "@/lib/prisma";
import {
  FREE_PHOTO,
  MAX_CHALLENGE_LABEL,
  MAX_CHALLENGE_POINTS,
  type Challenge,
} from "@/lib/challenges";

const PUBLIC_FIELDS = { id: true, label: true, points: true } as const;

/** The challenges guests can pick, in the order the host set. */
export function listChallenges(): Promise<Challenge[]> {
  return prisma.challenge.findMany({
    where: { retired: false },
    orderBy: { position: "asc" },
    select: PUBLIC_FIELDS,
  });
}

/** Only a challenge that can still be picked for a new upload. */
export function getActiveChallenge(id: string): Promise<Challenge | null> {
  return prisma.challenge.findFirst({ where: { id, retired: false }, select: PUBLIC_FIELDS });
}

/** Label for every id a stored photo may reference, retired challenges and "Foto libre" included. */
export async function challengeLabels(): Promise<Map<string, string>> {
  const rows = await prisma.challenge.findMany({ select: { id: true, label: true } });
  return new Map([[FREE_PHOTO.id, FREE_PHOTO.label], ...rows.map((c) => [c.id, c.label] as const)]);
}

/**
 * `{ label, points }` from a host request, trimmed and range-checked. Either may be missing
 * when `partial` (an edit that only touches one); returns an error message when invalid.
 */
export function parseChallengeInput(
  body: unknown,
  { partial }: { partial: boolean }
): { label?: string; points?: number } | string {
  const { label, points } = (body ?? {}) as Record<string, unknown>;
  const data: { label?: string; points?: number } = {};

  if (label !== undefined || !partial) {
    const text = typeof label === "string" ? label.trim().replace(/\s+/g, " ") : "";
    if (!text) return "Escribí la consigna";
    if (text.length > MAX_CHALLENGE_LABEL) return `Máximo ${MAX_CHALLENGE_LABEL} caracteres`;
    data.label = text;
  }
  if (points !== undefined || !partial) {
    if (typeof points !== "number" || !Number.isInteger(points) || points < 0 || points > MAX_CHALLENGE_POINTS) {
      return `Los puntos tienen que ser un número entero entre 0 y ${MAX_CHALLENGE_POINTS}`;
    }
    data.points = points;
  }
  return data;
}
