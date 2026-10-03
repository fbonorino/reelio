import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { FREE_PHOTO, MAX_FREE_PHOTOS_PER_USER, MAX_PHOTOS_PER_USER } from "@/lib/challenges";
import { normalizeInstagram } from "@/lib/instagram";
import { isInvited, notInvitedResponse } from "@/lib/guests";

/**
 * How many challenge photos and free photos `?instagram=` has left. Also how the app revalidates a saved handle:
 * a 403 with `code: NOT_INVITED` means it was removed from the guest list.
 */
export async function GET(request: NextRequest) {
  const instagram = normalizeInstagram(request.nextUrl.searchParams.get("instagram"));
  if (!instagram) {
    return NextResponse.json({ error: "Usuario de Instagram inválido" }, { status: 400 });
  }
  if (!(await isInvited(instagram))) {
    return notInvitedResponse();
  }

  // Challenge photos and "Foto libre" have separate caps.
  const [used, freeUsed] = await Promise.all([
    prisma.photo.count({ where: { instagram, challengeId: { not: FREE_PHOTO.id } } }),
    prisma.photo.count({ where: { instagram, challengeId: FREE_PHOTO.id } }),
  ]);
  return NextResponse.json(
    {
      used,
      remaining: Math.max(0, MAX_PHOTOS_PER_USER - used),
      max: MAX_PHOTOS_PER_USER,
      free: {
        used: freeUsed,
        remaining: Math.max(0, MAX_FREE_PHOTOS_PER_USER - freeUsed),
        max: MAX_FREE_PHOTOS_PER_USER,
      },
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
