import type { NextRequest } from "next/server";

/** Host-only routes are authorized with `?key=HOST_SECRET`, same as the /host page URL. */
export function isHost(request: NextRequest) {
  const key = request.nextUrl.searchParams.get("key");
  return !!process.env.HOST_SECRET && key === process.env.HOST_SECRET;
}
