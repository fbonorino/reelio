import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import cloudinary, { parseCloudinaryUrl } from "@/lib/cloudinary";
import { isHost } from "@/lib/host";

/** Host-only: `{ invalidated: boolean }` — invalidating removes the photo's challenge points from its owner's score. */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isHost(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { invalidated } = await request.json();
  if (typeof invalidated !== "boolean") {
    return NextResponse.json({ error: "Missing invalidated flag" }, { status: 400 });
  }

  const { id } = await params;
  try {
    // adjustedAt counts as a scoring event for the "who got there first" tiebreak.
    const photo = await prisma.photo.update({
      where: { id },
      data: { invalidated, adjustedAt: new Date() },
    });
    return NextResponse.json({ photo });
  } catch {
    return NextResponse.json({ error: "Photo not found" }, { status: 404 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isHost(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const photo = await prisma.photo.findUnique({ where: { id } });
  if (!photo) {
    return NextResponse.json({ error: "Photo not found" }, { status: 404 });
  }

  const publicId = parseCloudinaryUrl(photo.url)?.publicId;
  if (publicId) {
    try {
      await cloudinary.uploader.destroy(publicId, {
        resource_type: photo.type === "VIDEO" ? "video" : "image",
      });
    } catch {
      // Continue with DB deletion even if Cloudinary cleanup fails.
    }
  }

  await prisma.photo.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
