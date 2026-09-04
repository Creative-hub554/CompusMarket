import { createClerkClient, type ClerkClient } from "@clerk/backend";
import { Logger } from "@nestjs/common";

/**
 * One-way mirror of the app's DB-authoritative role into Clerk publicMetadata
 * so Clerk-powered surfaces (session token claims, client-side useUser()) can
 * reflect promote/demote/ban changes without waiting for the DB session fetch.
 *
 * Best-effort by design: the database stays the source of truth, so a Clerk
 * outage or misconfiguration must never fail the role change itself — the
 * metadata sync simply degrades and the next successful change re-syncs it.
 */
let client: ClerkClient | null = null;

function getClient(): ClerkClient | null {
  const secretKey = process.env.CLERK_SECRET_KEY;
  if (!secretKey) return null;
  if (!client) client = createClerkClient({ secretKey });
  return client;
}

export async function pushRoleToClerk(clerkId: string, role: string): Promise<void> {
  const clerk = getClient();
  if (!clerk) {
    Logger.warn("CLERK_SECRET_KEY is not set — skipping Clerk role metadata sync", "ClerkSync");
    return;
  }
  try {
    await clerk.users.updateUserMetadata(clerkId, {
      publicMetadata: { role },
    });
  } catch (err) {
    // Non-fatal: DB role is authoritative; log and continue.
    Logger.warn(`Failed to sync role "${role}" to Clerk for user ${clerkId}: ${(err as Error).message}`, "ClerkSync");
  }
}