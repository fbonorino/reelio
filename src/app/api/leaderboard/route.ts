import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { FREE_PHOTO, POINTS_PER_LIKE } from "@/lib/challenges";
import { rankEntries } from "@/lib/ranking";
import type { LeaderboardEntry, TopPhoto } from "@/lib/types";

type Totals = Omit<LeaderboardEntry, "rank" | "instagram" | "lastScoredAt"> & {
  lastScoredAt: Date | null;
};

function latest(...dates: (Date | null | undefined)[]) {
  return dates.reduce<Date | null>((max, d) => (d && (!max || d > max) ? d : max), null);
}

export async function GET() {
  // Post-deadline photos are keepsakes and free photos never score: neither counts, not even
  // their likes. Leaving them out here keeps them out of the tiebreak and the winner too.
  const photos = await prisma.photo.findMany({
    where: { postDeadline: false, challengeId: { not: FREE_PHOTO.id } },
    select: {
      id: true,
      url: true,
      thumbnailUrl: true,
      type: true,
      instagram: true,
      challengePoints: true,
      invalidated: true,
      likeCount: true,
      createdAt: true,
      adjustedAt: true,
      // Only the newest like matters: it's the photo's last scoring event from a like.
      likes: { select: { createdAt: true }, orderBy: { createdAt: "desc" }, take: 1 },
    },
  });

  const totals = new Map<string, Totals>();
  for (const photo of photos) {
    const entry: Totals = totals.get(photo.instagram) ?? {
      score: 0,
      photoCount: 0,
      likes: 0,
      topPhoto: null,
      lastScoredAt: null,
    };
    // Invalidated photos lose their challenge points but keep the likes they earned.
    const points =
      (photo.invalidated ? 0 : photo.challengePoints) + photo.likeCount * POINTS_PER_LIKE;
    entry.score += points;
    entry.photoCount += 1;
    entry.likes += photo.likeCount;
    if (!entry.topPhoto || points > entry.topPhoto.points) {
      const { id, url, thumbnailUrl, type } = photo;
      entry.topPhoto = { id, url, thumbnailUrl, type, points } satisfies TopPhoto;
    }
    entry.lastScoredAt = latest(
      entry.lastScoredAt,
      photo.createdAt,
      photo.adjustedAt,
      photo.likes[0]?.createdAt
    );
    totals.set(photo.instagram, entry);
  }

  const leaderboard: LeaderboardEntry[] = rankEntries(
    [...totals.entries()].map(([instagram, t]) => ({
      instagram,
      ...t,
      lastScoredAt: t.lastScoredAt?.toISOString() ?? null,
    }))
  );

  return NextResponse.json({ leaderboard });
}
