import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { normalizeInstagram } from "@/lib/instagram";
import { checkInInvited, notInvitedResponse } from "@/lib/guests";
import { PHOTO_LIMITS, tallyPhotos } from "@/lib/quota";
import { getBonusState } from "@/lib/bonus-db";
import { issueBonusTicket } from "@/lib/bonus-ticket";

/**
 * How many challenge, free and bonus photos `?instagram=` has left. Also how the app revalidates a saved handle:
 * a 403 with `code: NOT_INVITED` means it was removed from the guest list. It's the app's first server call
 * after onboarding, so it's also where a guest's first entry is recorded (AllowedHandle.firstEnteredAt).
 * While the bonus track is open it also hands out `bonus.ticket`: the app sends it with a bonus upload so
 * the server knows the upload started before the close, for the grace period.
 */
export async function GET(request: NextRequest) {
  const instagram = normalizeInstagram(request.nextUrl.searchParams.get("instagram"));
  if (!instagram) {
    return NextResponse.json({ error: "Usuario de Instagram inválido" }, { status: 400 });
  }
  if (!(await checkInInvited(instagram))) {
    return notInvitedResponse();
  }

  const now = Date.now();
  const [photos, { phase }] = await Promise.all([
    prisma.photo.findMany({ where: { instagram }, select: { challengeId: true, isBonus: true } }),
    getBonusState(now),
  ]);
  const tally = tallyPhotos(photos);
  const count = (kind: keyof typeof tally) => ({
    used: tally[kind],
    remaining: Math.max(0, PHOTO_LIMITS[kind] - tally[kind]),
    max: PHOTO_LIMITS[kind],
  });
  const secret = process.env.HOST_SECRET;

  return NextResponse.json(
    {
      ...count("challenge"),
      free: count("free"),
      bonus: {
        ...count("bonus"),
        // Bonus challenges already used: each one counts once per guest.
        challengeIds: photos.filter((p) => p.isBonus).map((p) => p.challengeId),
        ticket: phase === "open" && secret ? issueBonusTicket(instagram, now, secret) : null,
      },
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
