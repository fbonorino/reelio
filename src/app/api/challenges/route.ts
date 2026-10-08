import { NextResponse } from "next/server";
import { listChallenges } from "@/lib/challenges-db";

/** The challenges guests can pick, in the order the host set. */
export async function GET() {
  const challenges = await listChallenges();
  return NextResponse.json({ challenges }, { headers: { "Cache-Control": "no-store" } });
}
