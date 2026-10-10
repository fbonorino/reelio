import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { NOT_INVITED } from "@/lib/instagram";
import { isInvited } from "@/lib/guests";
import { guestListResult, type GuestTrace } from "@/lib/guest-list";

/** Each guest's first photo, first like and approved access request: what counts as having got in. */
async function traces(): Promise<GuestTrace[]> {
  const [photos, likes, approved] = await Promise.all([
    prisma.photo.groupBy({ by: ["instagram"], _min: { createdAt: true } }),
    prisma.like.groupBy({ by: ["instagram"], _min: { createdAt: true } }),
    prisma.accessRequest.findMany({
      where: { status: "APPROVED" },
      select: { handle: true, createdAt: true },
    }),
  ]);
  const firsts = [...photos, ...likes].flatMap((r) =>
    r._min.createdAt ? [{ handle: r.instagram, at: r._min.createdAt }] : []
  );
  return [...firsts, ...approved.map((r) => ({ handle: r.handle, at: r.createdAt }))];
}

async function allowedHandles() {
  const rows = await prisma.allowedHandle.findMany({ select: { handle: true } });
  return rows.map((r) => r.handle);
}

/**
 * The "Invitados" panel: handles of guests who already got in, newest first. Only for a guest on the
 * list (`?instagram=`, like the other guest routes), and only handles: nothing about anyone who hasn't come in.
 */
export async function GET(request: NextRequest) {
  const { status, body } = await guestListResult(
    request.nextUrl.searchParams.get("instagram"),
    { isInvited, traces, allowedHandles },
    NOT_INVITED
  );
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
}
