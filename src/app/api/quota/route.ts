import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { MAX_PHOTOS_PER_USER } from "@/lib/challenges";
import { normalizeInstagram } from "@/lib/instagram";
import { isInvited, notInvitedResponse } from "@/lib/guests";

/**
 * How many photos `?instagram=` has left. Also how the app revalidates a saved handle:
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

  const used = await prisma.photo.count({ where: { instagram } });
  return NextResponse.json(
    { used, remaining: Math.max(0, MAX_PHOTOS_PER_USER - used), max: MAX_PHOTOS_PER_USER },
    { headers: { "Cache-Control": "no-store" } }
  );
}
