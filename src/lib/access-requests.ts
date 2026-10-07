import { prisma } from "@/lib/prisma";
import { isInvited } from "@/lib/guests";

/** What a guest's waiting screen sees. "approved" means they're on the guest list now. */
export type AccessStatus = "approved" | "pending" | "rejected" | "none";

/** The guest list is the source of truth for "approved": a request only tracks the asking. */
export async function getAccessStatus(handle: string): Promise<AccessStatus> {
  if (await isInvited(handle)) return "approved";
  const request = await prisma.accessRequest.findUnique({
    where: { handle },
    select: { status: true },
  });
  if (!request) return "none";
  // Approved but no longer invited means the host removed them afterwards.
  return request.status === "PENDING" ? "pending" : "rejected";
}
