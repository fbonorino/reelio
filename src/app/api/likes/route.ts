import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { normalizeInstagram } from "@/lib/instagram";
import { hasEventEnded } from "@/lib/event";

type LikeRequest = { photoId: string; instagram: string };

/** Shared checks for liking and unliking. Returns the parsed request or an error response. */
async function validate(request: NextRequest): Promise<LikeRequest | NextResponse> {
  const body = await request.json().catch(() => null);
  const photoId = body?.photoId;
  const instagram = normalizeInstagram(body?.instagram);

  if (typeof photoId !== "string" || !photoId) {
    return NextResponse.json({ error: "Falta la foto" }, { status: 400 });
  }
  if (!instagram) {
    return NextResponse.json({ error: "Usuario de Instagram inválido" }, { status: 400 });
  }
  if (hasEventEnded()) {
    return NextResponse.json({ error: "El juego ya terminó" }, { status: 403 });
  }

  // Likes are worth points to the uploader, so you can't like your own photos.
  const photo = await prisma.photo.findUnique({ where: { id: photoId }, select: { instagram: true } });
  if (!photo) {
    return NextResponse.json({ error: "La foto ya no existe" }, { status: 404 });
  }
  if (photo.instagram === instagram) {
    return NextResponse.json({ error: "No podés likear tus propias fotos" }, { status: 403 });
  }

  return { photoId, instagram };
}

async function likeCountOf(photoId: string) {
  const photo = await prisma.photo.findUnique({ where: { id: photoId }, select: { likeCount: true } });
  return photo?.likeCount ?? 0;
}

/** Like a photo. One like per handle per photo, enforced by the (photoId, instagram) unique index. */
export async function POST(request: NextRequest) {
  const parsed = await validate(request);
  if (parsed instanceof NextResponse) return parsed;
  const { photoId, instagram } = parsed;

  try {
    // If the insert hits the unique index, the batch rolls back and the count isn't bumped.
    const [, photo] = await prisma.$transaction([
      prisma.like.create({ data: { photoId, instagram } }),
      prisma.photo.update({ where: { id: photoId }, data: { likeCount: { increment: 1 } } }),
    ]);
    return NextResponse.json({ liked: true, likeCount: photo.likeCount }, { status: 201 });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      if (err.code === "P2002") {
        return NextResponse.json(
          { error: "Ya likeaste esta foto", liked: true, likeCount: await likeCountOf(photoId) },
          { status: 409 }
        );
      }
      // Photo deleted between the check and the insert.
      if (err.code === "P2003" || err.code === "P2025") {
        return NextResponse.json({ error: "La foto ya no existe" }, { status: 404 });
      }
    }
    throw err;
  }
}

/** Remove your like. A no-op (not an error) if there was none, so concurrent unlikes can't double-decrement. */
export async function DELETE(request: NextRequest) {
  const parsed = await validate(request);
  if (parsed instanceof NextResponse) return parsed;
  const { photoId, instagram } = parsed;

  const likeCount = await prisma.$transaction(async (tx) => {
    const { count } = await tx.like.deleteMany({ where: { photoId, instagram } });
    if (count === 0) return null;
    const photo = await tx.photo.update({
      where: { id: photoId },
      data: { likeCount: { decrement: count } },
    });
    return photo.likeCount;
  });

  return NextResponse.json({ liked: false, likeCount: likeCount ?? (await likeCountOf(photoId)) });
}
