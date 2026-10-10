import { instagramProfileUrl, normalizeInstagram } from "./instagram.ts";

/**
 * "Invitados" panel: the guests who already got into Reelio. There's no login record, so "got in"
 * means they left a trace: uploaded a photo, gave a like, or had an access request approved. Someone
 * who only opened the app and looked around doesn't show up until they do one of those.
 */

/** A guest's earliest trace of one kind. Several per handle is fine. */
export type GuestTrace = { handle: string; at: Date };

/**
 * Handles still on the guest list that left any trace, newest first by when they first did.
 * Anyone not on `allowed` (removed by the host, or never invited) is left out, and so is anything
 * that isn't a valid handle, so the client can trust every entry when it builds a profile link.
 */
export function enteredGuests(traces: GuestTrace[], allowed: ReadonlySet<string>): string[] {
  const firstSeen = new Map<string, number>();
  for (const { handle, at } of traces) {
    if (!allowed.has(handle) || !instagramProfileUrl(handle)) continue;
    const t = at.getTime();
    const prev = firstSeen.get(handle);
    if (prev === undefined || t < prev) firstSeen.set(handle, t);
  }
  return [...firstSeen]
    .sort(([a, ta], [b, tb]) => tb - ta || a.localeCompare(b))
    .map(([handle]) => handle);
}

export type GuestListDeps = {
  isInvited: (handle: string) => Promise<boolean>;
  traces: () => Promise<GuestTrace[]>;
  allowedHandles: () => Promise<string[]>;
};

export type GuestListResult =
  | { status: 200; body: { handles: string[] } }
  | { status: 401 | 403; body: { error: string; code?: string } };

/**
 * GET /api/guests. The app's guest "session" is the saved handle the other routes take as
 * `?instagram=`: without a valid one it's a 401, and a handle off the guest list is a 403 with
 * `notInvitedCode` so the app sends them back to onboarding.
 */
export async function guestListResult(
  rawInstagram: string | null,
  deps: GuestListDeps,
  notInvitedCode: string
): Promise<GuestListResult> {
  const instagram = normalizeInstagram(rawInstagram);
  if (!instagram) {
    return { status: 401, body: { error: "Entrá con tu usuario de Instagram para ver la lista" } };
  }
  if (!(await deps.isInvited(instagram))) {
    return {
      status: 403,
      body: { error: "No estás en la lista de invitados, avisale a Fran", code: notInvitedCode },
    };
  }
  const [traces, allowed] = await Promise.all([deps.traces(), deps.allowedHandles()]);
  return { status: 200, body: { handles: enteredGuests(traces, new Set(allowed)) } };
}
