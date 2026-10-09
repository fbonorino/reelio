import { POINTS_PER_LIKE } from "./challenges.ts";

/**
 * What one game photo adds to its uploader's score. `challengePoints` is the snapshot taken at upload
 * (bonus multiplier included); invalidating it takes exactly that away, but the likes stay.
 */
export function photoScore(photo: { challengePoints: number; invalidated: boolean; likeCount: number }) {
  return (photo.invalidated ? 0 : photo.challengePoints) + photo.likeCount * POINTS_PER_LIKE;
}

/**
 * Sorts by score (then handle, for a stable order) and assigns standard competition
 * ranks: ties share a position (1, 2, 2, 4).
 */
export function rankEntries<T extends { instagram: string; score: number }>(
  entries: T[]
): (T & { rank: number })[] {
  const sorted = [...entries].sort(
    (a, b) => b.score - a.score || a.instagram.localeCompare(b.instagram)
  );
  const ranked: (T & { rank: number })[] = [];
  sorted.forEach((entry, i) => {
    const prev = ranked[i - 1];
    ranked.push({ ...entry, rank: prev && prev.score === entry.score ? prev.rank : i + 1 });
  });
  return ranked;
}
