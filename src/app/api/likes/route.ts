import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { photoId, deviceId } = body;

  if (!photoId || !deviceId) {
    return NextResponse.json({ error: "Missing photoId or deviceId" }, { status: 400 });
  }

  const existingLike = await prisma.like.findUnique({
    where: { photoId_deviceId: { photoId, deviceId } },
  });

  if (existingLike) {
    const [, photo] = await prisma.$transaction([
      prisma.like.delete({ where: { id: existingLike.id } }),
      prisma.photo.update({
        where: { id: photoId },
        data: { likeCount: { decrement: 1 } },
      }),
    ]);
    return NextResponse.json({ liked: false, likeCount: photo.likeCount });
  }

  try {
    const [, photo] = await prisma.$transaction([
      prisma.like.create({ data: { photoId, deviceId } }),
      prisma.photo.update({
        where: { id: photoId },
        data: { likeCount: { increment: 1 } },
      }),
    ]);
    return NextResponse.json({ liked: true, likeCount: photo.likeCount });
  } catch {
    return NextResponse.json({ error: "Photo not found" }, { status: 404 });
  }
}
