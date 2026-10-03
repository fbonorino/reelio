import { NextRequest, NextResponse } from "next/server";
import { isHost } from "@/lib/host";

/** Host-only: 200 if `?key=` is the host secret. Lets client pages gate host-only previews. */
export function GET(request: NextRequest) {
  if (!isHost(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
}
