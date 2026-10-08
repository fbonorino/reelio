import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isHost } from "@/lib/host";
import { parseChallengeInput } from "@/lib/challenges-db";

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

function notFound() {
  return NextResponse.json({ error: "Esa consigna ya no existe" }, { status: 404 });
}

/**
 * Host-only: `{ label?, points? }`. New points only apply to photos uploaded from now on:
 * each photo keeps the points it was uploaded with.
 */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isHost(request)) return unauthorized();

  const data = parseChallengeInput(await request.json().catch(() => null), { partial: true });
  if (typeof data === "string") return NextResponse.json({ error: data }, { status: 400 });

  const { id } = await params;
  const { count } = await prisma.challenge.updateMany({ where: { id, retired: false }, data });
  if (count === 0) return notFound();
  return NextResponse.json({ success: true });
}

/**
 * Host-only: takes a challenge out of the game. It's retired rather than deleted, so photos
 * already uploaded for it (or mid-upload right now) still show its label.
 */
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isHost(request)) return unauthorized();

  const { id } = await params;
  const { count } = await prisma.challenge.updateMany({
    where: { id, retired: false },
    data: { retired: true },
  });
  if (count === 0) return notFound();
  return NextResponse.json({ success: true });
}
