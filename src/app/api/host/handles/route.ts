import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isHost } from "@/lib/host";
import { normalizeInstagram } from "@/lib/instagram";

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

/** Host-only: the full guest list. */
export async function GET(request: NextRequest) {
  if (!isHost(request)) return unauthorized();

  const guests = await prisma.allowedHandle.findMany({
    select: { handle: true, createdAt: true },
    orderBy: { handle: "asc" },
  });
  return NextResponse.json({ guests }, { headers: { "Cache-Control": "no-store" } });
}

/**
 * Host-only: `{ text }` — handles separated by newlines, commas or semicolons. Not spaces, so a
 * typo like "juan perez" is reported as invalid instead of adding "juan" and "perez".
 */
export async function POST(request: NextRequest) {
  if (!isHost(request)) return unauthorized();

  const body = await request.json().catch(() => null);
  if (typeof body?.text !== "string") {
    return NextResponse.json({ error: "Falta la lista de invitados" }, { status: 400 });
  }

  const handles = new Set<string>();
  const invalid: string[] = [];
  for (const raw of body.text.split(/[\n,;]+/)) {
    const token = raw.trim();
    if (!token) continue;
    // normalizeInstagram drops inner spaces (a phone keyboard's stray space), but in a list
    // they're more likely two words that aren't a handle.
    const handle = /\s/.test(token) ? null : normalizeInstagram(token);
    if (handle) handles.add(handle);
    else invalid.push(token);
  }

  const { count } = await prisma.allowedHandle.createMany({
    data: [...handles].map((handle) => ({ handle })),
    skipDuplicates: true,
  });
  // Anyone added here who was waiting on a request gets in, same as approving it.
  await prisma.accessRequest.updateMany({
    where: { handle: { in: [...handles] }, status: "PENDING" },
    data: { status: "APPROVED", decidedAt: new Date() },
  });

  return NextResponse.json({ added: count, duplicates: handles.size - count, invalid });
}

/**
 * Host-only: `?handle=` removes a guest. Their photos and likes stay, but upload and like
 * routes reject them from now on.
 */
export async function DELETE(request: NextRequest) {
  if (!isHost(request)) return unauthorized();

  const handle = normalizeInstagram(request.nextUrl.searchParams.get("handle"));
  if (!handle) {
    return NextResponse.json({ error: "Usuario de Instagram inválido" }, { status: 400 });
  }

  const { count } = await prisma.allowedHandle.deleteMany({ where: { handle } });
  if (count === 0) {
    return NextResponse.json({ error: "Ese @ no estaba en la lista" }, { status: 404 });
  }
  return NextResponse.json({ success: true });
}
