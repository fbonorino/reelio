import { NextResponse } from "next/server";
import { BONUS_MULTIPLIER, type EventStatus } from "@/lib/bonus";
import { getBonusState } from "@/lib/bonus-db";

/**
 * Light, polled by every phone: where the bonus track stands and the server's clock. Never the
 * bonus challenges themselves; those come from /api/challenges once it's no longer "before".
 */
export async function GET() {
  const serverNow = Date.now();
  const { phase, settings, closesAt } = await getBonusState(serverNow);
  const status: EventStatus = {
    phase,
    serverNow,
    startsAt: settings.startsAt.toISOString(),
    closesAt: closesAt?.toISOString() ?? null,
    multiplier: BONUS_MULTIPLIER,
  };
  return NextResponse.json(status, { headers: { "Cache-Control": "no-store" } });
}
