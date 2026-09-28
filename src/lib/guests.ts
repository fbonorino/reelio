import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { NOT_INVITED } from "@/lib/instagram";

export async function isInvited(handle: string) {
  const row = await prisma.allowedHandle.findUnique({ where: { handle }, select: { id: true } });
  return row !== null;
}

export function notInvitedResponse() {
  return NextResponse.json(
    { error: "No estás en la lista de invitados, avisale a Fran", code: NOT_INVITED },
    { status: 403 }
  );
}
