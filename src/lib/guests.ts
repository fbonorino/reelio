import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { NOT_INVITED } from "@/lib/instagram";
import { checkInGuest, type EntryStore } from "@/lib/entry";

export async function isInvited(handle: string) {
  const row = await prisma.allowedHandle.findUnique({ where: { handle }, select: { id: true } });
  return row !== null;
}

const entryStore: EntryStore = {
  find: (handle) =>
    prisma.allowedHandle.findUnique({ where: { handle }, select: { firstEnteredAt: true } }),
  setFirstEnteredIfUnset: async (handle, at) => {
    await prisma.allowedHandle.updateMany({
      where: { handle, firstEnteredAt: null },
      data: { firstEnteredAt: at },
    });
  },
};

/** `isInvited`, and the first time it's true, records that the guest got in (AllowedHandle.firstEnteredAt). */
export function checkInInvited(handle: string) {
  return checkInGuest(handle, entryStore, new Date());
}

export function notInvitedResponse() {
  return NextResponse.json(
    { error: "No estás en la lista de invitados, avisale a Fran", code: NOT_INVITED },
    { status: 403 }
  );
}
