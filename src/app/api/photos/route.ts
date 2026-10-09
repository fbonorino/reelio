import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { FREE_PHOTO } from "@/lib/challenges";
import { challengeLabels, getActiveChallenge } from "@/lib/challenges-db";
import { normalizeInstagram } from "@/lib/instagram";
import { hasEventEnded } from "@/lib/event";
import { isInvited, notInvitedResponse } from "@/lib/guests";
import { checkBonusWindow, effectivePoints } from "@/lib/bonus";
import { getBonusState } from "@/lib/bonus-db";
import { readBonusTicket } from "@/lib/bonus-ticket";
import { PHOTO_LIMITS, quotaError, tallyPhotos, type PhotoKind } from "@/lib/quota";

export async function GET(request: NextRequest) {
  const sort = request.nextUrl.searchParams.get("sort");
  // Whose likes to mark as `likedByMe`. Identity is the normalized handle, not the device.
  const viewer = normalizeInstagram(request.nextUrl.searchParams.get("instagram"));

  const [photos, labels] = await Promise.all([
    prisma.photo.findMany({
      orderBy:
        sort === "top" ? [{ likeCount: "desc" }, { createdAt: "desc" }] : { createdAt: "desc" },
    }),
    challengeLabels(),
  ]);

  let likedPhotoIds = new Set<string>();
  if (viewer) {
    const likes = await prisma.like.findMany({
      where: { instagram: viewer, photoId: { in: photos.map((p) => p.id) } },
      select: { photoId: true },
    });
    likedPhotoIds = new Set(likes.map((l) => l.photoId));
  }

  return NextResponse.json({
    photos: photos.map((photo) => ({
      ...photo,
      challengeLabel: labels.get(photo.challengeId) ?? photo.challengeId,
      likedByMe: likedPhotoIds.has(photo.id),
    })),
  });
}

class QuotaError extends Error {
  constructor(message: string, readonly limit: boolean) {
    super(message);
  }
}

export async function POST(request: NextRequest) {
  // One server clock reading for the whole request: the phone's clock is never asked.
  const now = Date.now();
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Faltan datos de la foto" }, { status: 400 });
  }
  const { url, thumbnailUrl, type, challengeId } = body;
  const instagram = normalizeInstagram(body.instagram);
  const free = challengeId === FREE_PHOTO.id;
  const challenge =
    typeof challengeId === "string" && !free ? await getActiveChallenge(challengeId) : null;

  if (!url || !thumbnailUrl || !type) {
    return NextResponse.json({ error: "Faltan datos de la foto" }, { status: 400 });
  }
  if (type !== "IMAGE" && type !== "VIDEO") {
    return NextResponse.json({ error: "Tipo de archivo inválido" }, { status: 400 });
  }
  if (!instagram) {
    return NextResponse.json({ error: "Usuario de Instagram inválido" }, { status: 400 });
  }
  if (!(await isInvited(instagram))) {
    return notInvitedResponse();
  }
  if (!challenge && !free) {
    return NextResponse.json(
      { error: typeof challengeId === "string" ? "Esa consigna ya no está, elegí otra" : "Elegí una consigna" },
      { status: 400 }
    );
  }

  const bonus = challenge?.isBonus ?? false;
  // A late bonus upload got in on the grace period: it started before the close, so it still scores.
  let late = false;
  if (bonus) {
    const { settings, eventEnd } = await getBonusState(now);
    const ticketIssuedAt = readBonusTicket(body.bonusTicket, instagram, process.env.HOST_SECRET ?? "");
    const window = checkBonusWindow(settings, eventEnd, now, ticketIssuedAt);
    if (!window.ok) {
      return window.hidden
        ? NextResponse.json({ error: window.error }, { status: 400 })
        : NextResponse.json({ error: window.error, code: "BONUS_CLOSED" }, { status: 403 });
    }
    late = window.late;
  }

  // Uploads stay open after the game closes, but those photos are keepsakes: no points, no ranking.
  const postDeadline = hasEventEnded(now) && !late;
  // Challenge, free and bonus photos are capped separately, before and after the close alike.
  const kind: PhotoKind = free ? "free" : bonus ? "bonus" : "challenge";
  const max = PHOTO_LIMITS[kind];

  try {
    // Serializable so two concurrent uploads from the same user can't both pass the limit check.
    const { photo, count } = await prisma.$transaction(
      async (tx) => {
        const existing = await tx.photo.findMany({
          where: { instagram },
          select: { challengeId: true, isBonus: true },
        });
        const rejected = quotaError(kind, challenge?.id ?? FREE_PHOTO.id, existing);
        if (rejected) throw new QuotaError(rejected.error, rejected.limit);
        const photo = await tx.photo.create({
          data: {
            url,
            thumbnailUrl,
            type,
            instagram,
            challengeId: challenge?.id ?? FREE_PHOTO.id,
            // Snapshot with the multiplier applied, so the ranking and the host's discount use it as is.
            challengePoints: postDeadline || !challenge ? 0 : effectivePoints(challenge),
            postDeadline,
            isBonus: bonus,
          },
        });
        return { photo, count: tallyPhotos(existing)[kind] + 1 };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    );

    // `remaining` is always for the kind just uploaded.
    return NextResponse.json({ photo, remaining: max - count }, { status: 201 });
  } catch (err) {
    if (err instanceof QuotaError) {
      return NextResponse.json(
        // `remaining: 0` tells the app this kind is used up; a repeated bonus challenge isn't.
        { error: err.message, ...(err.limit ? { remaining: 0 } : { code: "BONUS_REPEAT" }) },
        { status: 409 }
      );
    }
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2034") {
      return NextResponse.json({ error: "Se cruzaron dos subidas, probá de nuevo" }, { status: 409 });
    }
    throw err;
  }
}
