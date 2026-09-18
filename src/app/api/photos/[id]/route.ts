import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import cloudinary from "@/lib/cloudinary";

function extractPublicId(url: string): string | null {
  const match = url.match(/\/upload\/(?:v\d+\/)?(.+)\.\w+$/);
  return match ? match[1] : null;
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const key = request.nextUrl.searchParams.get("key");
  if (!process.env.HOST_SECRET || key !== process.env.HOST_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const photo = await prisma.photo.findUnique({ where: { id } });
  if (!photo) {
    return NextResponse.json({ error: "Photo not found" }, { status: 404 });
  }

  const publicId = extractPublicId(photo.url);
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
