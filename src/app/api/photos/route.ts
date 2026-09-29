import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getChallenge, MAX_PHOTOS_PER_USER } from "@/lib/challenges";
import { normalizeInstagram } from "@/lib/instagram";
import { hasEventEnded } from "@/lib/event";
import { isInvited, notInvitedResponse } from "@/lib/guests";

export async function GET(request: NextRequest) {
  const sort = request.nextUrl.searchParams.get("sort");
  // Whose likes to mark as `likedByMe`. Identity is the normalized handle, not the device.
  const viewer = normalizeInstagram(request.nextUrl.searchParams.get("instagram"));

  const photos = await prisma.photo.findMany({
    orderBy:
      sort === "top" ? [{ likeCount: "desc" }, { createdAt: "desc" }] : { createdAt: "desc" },
  });

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
      likedByMe: likedPhotoIds.has(photo.id),
    })),
  });
}

class LimitReachedError extends Error {}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Faltan datos de la foto" }, { status: 400 });
  }
  const { url, thumbnailUrl, type, challengeId } = body;
  const instagram = normalizeInstagram(body.instagram);
  const challenge = typeof challengeId === "string" ? getChallenge(challengeId) : undefined;

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
  if (!challenge) {
    return NextResponse.json({ error: "Elegí una consigna" }, { status: 400 });
  }
  // Uploads stay open after the game closes, but those photos are keepsakes: no points, no ranking.
  const postDeadline = hasEventEnded();

  try {
    // Serializable so two concurrent uploads from the same user can't both pass the limit check.
    const { photo, count } = await prisma.$transaction(
      async (tx) => {
        const existing = await tx.photo.count({ where: { instagram } });
        if (existing >= MAX_PHOTOS_PER_USER) throw new LimitReachedError();
        const photo = await tx.photo.create({
          data: {
            url,
            thumbnailUrl,
            type,
            instagram,
            challengeId: challenge.id,
            challengePoints: postDeadline ? 0 : challenge.points,
            postDeadline,
          },
        });
        return { photo, count: existing + 1 };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    );

    return NextResponse.json(
      { photo, remaining: MAX_PHOTOS_PER_USER - count },
      { status: 201 }
    );
  } catch (err) {
    if (err instanceof LimitReachedError) {
      return NextResponse.json(
        { error: `Ya subiste tus ${MAX_PHOTOS_PER_USER} fotos`, remaining: 0 },
        { status: 409 }
      );
    }
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2034") {
      return NextResponse.json({ error: "Se cruzaron dos subidas, probá de nuevo" }, { status: 409 });
    }
    throw err;
  }
}
