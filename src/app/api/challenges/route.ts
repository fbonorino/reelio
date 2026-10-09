import { NextResponse } from "next/server";
import { listChallenges } from "@/lib/challenges-db";
import { guestChallenges } from "@/lib/bonus";
import { getBonusState } from "@/lib/bonus-db";

/**
 * The challenges guests can pick, in the order the host set. `bonus` lists the bonus track ones,
 * points already multiplied, and stays empty until the window opens.
 */
export async function GET() {
  const [challenges, bonus, { phase }] = await Promise.all([
    listChallenges(),
    listChallenges({ bonus: true }),
    getBonusState(Date.now()),
  ]);
  return NextResponse.json(guestChallenges(challenges, bonus, phase), {
    headers: { "Cache-Control": "no-store" },
  });
}
