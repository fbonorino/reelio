import { NextResponse } from "next/server";

/** Server clock, so every phone closes the game at the same moment whatever its own clock says. */
export function GET() {
  return NextResponse.json({ now: Date.now() }, { headers: { "Cache-Control": "no-store" } });
}
