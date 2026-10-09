import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isHost } from "@/lib/host";
import { listChallenges, parseChallengeInput } from "@/lib/challenges-db";

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

/** `?bonus=1` works on the bonus track list instead: same editor, separate list and order. */
function isBonusList(request: NextRequest) {
  return request.nextUrl.searchParams.get("bonus") === "1";
}

/**
 * Host-only: the challenges guests can pick, in order, with how many photos each one has.
 * Bonus ones (`?bonus=1`) come with their base points, as the host typed them.
 */
export async function GET(request: NextRequest) {
  if (!isHost(request)) return unauthorized();

  const [challenges, counts] = await Promise.all([
    listChallenges({ bonus: isBonusList(request) }),
    prisma.photo.groupBy({ by: ["challengeId"], _count: { _all: true } }),
  ]);
  const photos = new Map(counts.map((c) => [c.challengeId, c._count._all]));
  return NextResponse.json(
    { challenges: challenges.map((c) => ({ ...c, photoCount: photos.get(c.id) ?? 0 })) },
    { headers: { "Cache-Control": "no-store" } }
  );
}

/** Host-only: `{ label, points }` adds a challenge at the end of the list (base points, for a bonus one). */
export async function POST(request: NextRequest) {
  if (!isHost(request)) return unauthorized();

  const data = parseChallengeInput(await request.json().catch(() => null), { partial: false });
  if (typeof data === "string") return NextResponse.json({ error: data }, { status: 400 });

  const isBonus = isBonusList(request);
  const last = await prisma.challenge.aggregate({ where: { isBonus }, _max: { position: true } });
  const challenge = await prisma.challenge.create({
    data: { label: data.label!, points: data.points!, isBonus, position: (last._max.position ?? -1) + 1 },
    select: { id: true, label: true, points: true },
  });
  return NextResponse.json({ challenge }, { status: 201 });
}

/** Host-only: `{ order: id[] }` — every active challenge's id (of that list), in the new order. */
export async function PUT(request: NextRequest) {
  if (!isHost(request)) return unauthorized();

  const body = await request.json().catch(() => null);
  const order: unknown = body?.order;
  if (!Array.isArray(order) || !order.every((id) => typeof id === "string")) {
    return NextResponse.json({ error: "Falta el orden" }, { status: 400 });
  }

  const active = await listChallenges({ bonus: isBonusList(request) });
  const ids = new Set(active.map((c) => c.id));
  // Exactly the current list, so a stale tab can't drop or duplicate one someone else just added.
  if (order.length !== ids.size || new Set(order).size !== ids.size || !order.every((id) => ids.has(id))) {
    return NextResponse.json(
      { error: "La lista cambió mientras la ordenabas, probá de nuevo" },
      { status: 409 }
    );
  }

  await prisma.$transaction(
    order.map((id, position) => prisma.challenge.update({ where: { id }, data: { position } }))
  );
  return NextResponse.json({ success: true });
}
