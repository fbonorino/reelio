import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { normalizeInstagram } from "@/lib/instagram";
import { getAccessStatus } from "@/lib/access-requests";

function invalidHandle() {
  return NextResponse.json({ error: "Usuario de Instagram inválido" }, { status: 400 });
}

/** `?handle=` — polled by the guest's waiting screen until the host approves. */
export async function GET(request: NextRequest) {
  const handle = normalizeInstagram(request.nextUrl.searchParams.get("handle"));
  if (!handle) return invalidHandle();

  const status = await getAccessStatus(handle);
  return NextResponse.json({ status }, { headers: { "Cache-Control": "no-store" } });
}

/**
 * `{ handle }` — asks the host to add a handle that isn't on the guest list. Asking again is a
 * no-op: a pending request keeps its original date, and a rejected one stays rejected.
 */
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const handle = normalizeInstagram(body?.handle);
  if (!handle) return invalidHandle();

  const current = await getAccessStatus(handle);
  if (current !== "none") return NextResponse.json({ handle, status: current });

  // Upsert so two taps racing each other can't trip the unique constraint.
  await prisma.accessRequest.upsert({ where: { handle }, create: { handle }, update: {} });
  return NextResponse.json({ handle, status: "pending" });
}
