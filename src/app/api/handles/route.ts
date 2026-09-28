import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const MIN_QUERY_LENGTH = 2;
const MAX_RESULTS = 8;

/**
 * Public guest-list search for onboarding. Deliberately never returns the whole list:
 * needs at least 2 characters and caps the results.
 */
export async function GET(request: NextRequest) {
  const q = (request.nextUrl.searchParams.get("q") ?? "").trim().replace(/^@+/, "").toLowerCase();
  // Handles only contain these characters, so anything else can't match.
  if (q.length < MIN_QUERY_LENGTH || !/^[a-z0-9._]+$/.test(q)) {
    return NextResponse.json({ handles: [] });
  }

  const rows = await prisma.allowedHandle.findMany({
    where: { handle: { contains: q } },
    select: { handle: true },
    orderBy: { handle: "asc" },
    // Fetch extra so prefix matches can be ranked first before trimming.
    take: MAX_RESULTS * 4,
  });

  const handles = rows
    .map((r) => r.handle)
    // "_" is a LIKE wildcard, so re-check literally.
    .filter((h) => h.includes(q))
    .sort((a, b) => Number(!a.startsWith(q)) - Number(!b.startsWith(q)))
    .slice(0, MAX_RESULTS);

  return NextResponse.json({ handles }, { headers: { "Cache-Control": "no-store" } });
}
