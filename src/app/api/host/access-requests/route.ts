import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isHost } from "@/lib/host";
import { normalizeInstagram } from "@/lib/instagram";

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

/** Host-only: pending requests, oldest first. */
export async function GET(request: NextRequest) {
  if (!isHost(request)) return unauthorized();

  const requests = await prisma.accessRequest.findMany({
    where: { status: "PENDING" },
    select: { handle: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json({ requests }, { headers: { "Cache-Control": "no-store" } });
}

const ACTIONS = ["approve", "reject", "reopen"] as const;
type Action = (typeof ACTIONS)[number];

/**
 * Host-only: `{ handle, action }`. "approve" adds the handle to the guest list (their waiting
 * screen lets them in on its next poll), "reject" closes the request, "reopen" undoes a reject.
 */
export async function POST(request: NextRequest) {
  if (!isHost(request)) return unauthorized();

  const body = await request.json().catch(() => null);
  const handle = normalizeInstagram(body?.handle);
  const action = body?.action as Action;
  if (!handle || !ACTIONS.includes(action)) {
    return NextResponse.json({ error: "Pedido inválido" }, { status: 400 });
  }

  const existing = await prisma.accessRequest.findUnique({ where: { handle } });
  if (!existing) {
    return NextResponse.json({ error: "No hay un pedido de ese @" }, { status: 404 });
  }

  if (action === "approve") {
    await prisma.$transaction([
      prisma.allowedHandle.createMany({ data: [{ handle }], skipDuplicates: true }),
      prisma.accessRequest.update({
        where: { handle },
        data: { status: "APPROVED", decidedAt: new Date() },
      }),
    ]);
  } else {
    await prisma.accessRequest.update({
      where: { handle },
      data:
        action === "reject"
          ? { status: "REJECTED", decidedAt: new Date() }
          : { status: "PENDING", decidedAt: null },
    });
  }
  return NextResponse.json({ success: true });
}
