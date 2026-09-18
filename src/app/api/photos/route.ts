import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const sort = request.nextUrl.searchParams.get("sort");
  const deviceId = request.nextUrl.searchParams.get("deviceId");

  const photos = await prisma.photo.findMany({
    orderBy:
      sort === "top" ? [{ likeCount: "desc" }, { createdAt: "desc" }] : { createdAt: "desc" },
  });

  let likedPhotoIds = new Set<string>();
  if (deviceId) {
    const likes = await prisma.like.findMany({
      where: { deviceId, photoId: { in: photos.map((p) => p.id) } },
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

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { url, thumbnailUrl, type, uploaderName } = body;

  if (!url || !thumbnailUrl || !type) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  if (type !== "IMAGE" && type !== "VIDEO") {
    return NextResponse.json({ error: "Invalid media type" }, { status: 400 });
  }

  const photo = await prisma.photo.create({
    data: {
      url,
      thumbnailUrl,
      type,
      uploaderName: uploaderName?.trim() || null,
    },
  });

  return NextResponse.json({ photo }, { status: 201 });
}
