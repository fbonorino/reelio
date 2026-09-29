import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { LeaderboardEntry } from "@/lib/types";

export async function GET() {
  // Post-deadline photos are keepsakes: they never count, not even their likes.
  const photos = await prisma.photo.findMany({
    where: { postDeadline: false },
    select: { instagram: true, challengePoints: true, invalidated: true, likeCount: true },
  });

  const totals = new Map<string, { score: number; photoCount: number }>();
  for (const photo of photos) {
    const entry = totals.get(photo.instagram) ?? { score: 0, photoCount: 0 };
    // Invalidated photos lose their challenge points but keep the likes they earned.
    entry.score += (photo.invalidated ? 0 : photo.challengePoints) + photo.likeCount;
    entry.photoCount += 1;
    totals.set(photo.instagram, entry);
  }

  const sorted = [...totals.entries()]
    .map(([instagram, t]) => ({ instagram, ...t }))
    .sort((a, b) => b.score - a.score || a.instagram.localeCompare(b.instagram));

  // Standard competition ranking: ties share a position (1, 2, 2, 4).
  const leaderboard: LeaderboardEntry[] = [];
  sorted.forEach((entry, i) => {
    const prev = leaderboard[i - 1];
    leaderboard.push({ ...entry, rank: prev && prev.score === entry.score ? prev.rank : i + 1 });
  });

  return NextResponse.json({ leaderboard });
}
