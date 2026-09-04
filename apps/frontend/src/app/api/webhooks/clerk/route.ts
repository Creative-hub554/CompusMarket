import { NextResponse } from "next/server";
import { Webhook } from "svix";
import { clerkClient } from "@clerk/nextjs/server";
import { prisma, Role } from "@theo/database";
import { getApiBase } from "@/lib/apiBase";

/**
 * Clerk user lifecycle events synced into the local database. Roles remain
 * DB-authoritative (clerkId is only the link), so this endpoint mirrors
 * identity fields — and Clerk bans, which map onto the BANNED role. Unbanning
 * is deliberately NOT automatic: only an admin changing the role in the app
 * can restore access.
 *
 * A ban that flips an existing account writes the same audit trail as the
 * admin PATCH endpoint (a RoleChangeLog entry with a null actor, since the
 * change came from the Clerk dashboard, not an app admin) in one transaction.
 * It then pings the backend internal endpoint so ops channels are alerted.
 */
type ClerkEmail = { id: string; email_address: string };
type ClerkUserEvent = {
  type: string;
  data: {
    id: string;
    first_name?: string | null;
    last_name?: string | null;
    image_url?: string | null;
    banned?: boolean;
    primary_email_address_id?: string | null;
    email_addresses?: ClerkEmail[];
    deleted?: boolean;
  };
};

const USER_SELECT = {
  id: true,
  email: true,
  role: true,
  clerkId: true,
  emailVerified: true,
} as const;

function identityOf(data: ClerkUserEvent["data"]) {
  const addresses = data.email_addresses ?? [];
  const primary =
    addresses.find((a) => a.id === data.primary_email_address_id) ??
    addresses[0];
  return {
    email: primary?.email_address ?? null,
    name:
      [data.first_name, data.last_name].filter(Boolean).join(" ").trim() ||
      null,
    image: data.image_url || null,
  };
}

/**
 * A Clerk-dashboard ban also lands here (Clerk -> DB); mirror it into
 * publicMetadata.role so the metadata claim agrees with the DB role, matching
 * what the admin role endpoint pushes. Best-effort: never fail the webhook.
 */
async function syncBanMetadata(clerkId: string) {
  try {
    const client = await clerkClient();
    await client.users.updateUserMetadata(clerkId, {
      publicMetadata: { role: "BANNED" },
    });
  } catch {
    // DB role stays authoritative; a later admin role change re-syncs.
  }
}

/**
 * Alert ops channels about a Clerk-dashboard ban. The audit row is already
 * committed locally by the caller; the backend internal endpoint only resolves
 * the target and pushes the Slack/Telegram notice. Best-effort with a short
 * timeout — a backend blip must never fail the webhook or lose the audit.
 */
async function notifyInternalBan(targetId: string, fromRole: string) {
  const token = process.env.INTERNAL_SERVICE_TOKEN;
  if (!token) return;
  try {
    const res = await fetch(`${getApiBase()}/internal/role-changes/notify`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-internal-token": token },
      body: JSON.stringify({ targetId, fromRole, toRole: "BANNED" }),
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) {
      console.error("clerk ban notify failed", res.status);
    }
  } catch (err) {
    console.error("clerk ban notify error", (err as Error).message);
  }
}

/**
 * Apply an identity update together with a ban: flips the role to BANNED and
 * records the transition (actor null = Clerk dashboard) in one transaction.
 */
async function updateWithBan(
  row: { id: string; email: string; role: string; clerkId: string | null; emailVerified: Date | null },
  identity: { email: string | null; name: string | null; image: string | null },
  extra: { clerkId?: string; emailVerified?: Date } = {}
) {
  const base = {
    ...(identity.email ? { email: identity.email } : {}),
    ...(identity.name ? { name: identity.name } : {}),
    ...(identity.image ? { image: identity.image } : {}),
    emailVerified: extra.emailVerified ?? row.emailVerified ?? new Date(),
  };
  const fromRole = row.role;
  const [updated] = await prisma.$transaction([
    prisma.user.update({
      where: { id: row.id },
      data: { ...extra, ...base, role: "BANNED" },
      select: USER_SELECT,
    }),
    prisma.roleChangeLog.create({
      data: { targetId: row.id, changedById: null, fromRole: fromRole as Role, toRole: "BANNED", reason: null },
    }),
  ]);
  void notifyInternalBan(row.id, fromRole);
  return updated;
}

async function upsertFromClerk(data: ClerkUserEvent["data"]) {
  const identity = identityOf(data);
  const banned = Boolean(data.banned);
  if (banned) {
    void syncBanMetadata(data.id);
  }
  const existing = await prisma.user.findUnique({
    where: { clerkId: data.id },
    select: USER_SELECT,
  });

  if (existing) {
    if (banned && existing.role !== "BANNED") {
      return updateWithBan(existing, identity);
    }
    return prisma.user.update({
      where: { id: existing.id },
      data: {
        ...(identity.email ? { email: identity.email } : {}),
        ...(identity.name ? { name: identity.name } : {}),
        ...(identity.image ? { image: identity.image } : {}),
        emailVerified: existing.emailVerified ?? new Date(),
      },
      select: USER_SELECT,
    });
  }

  // No local row yet: create it, or claim a pre-Clerk account with the same
  // (Clerk-verified) email when it is not already linked elsewhere.
  if (identity.email) {
    const byEmail = await prisma.user.findUnique({
      where: { email: identity.email },
      select: USER_SELECT,
    });
    if (byEmail) {
      if (byEmail.clerkId !== null) {
        // Linked to another Clerk user: leave it; provisioning will resolve.
        return byEmail;
      }
      if (banned && byEmail.role !== "BANNED") {
        return updateWithBan(byEmail, identity, { clerkId: data.id, emailVerified: new Date() });
      }
      return prisma.user.update({
        where: { id: byEmail.id },
        data: { clerkId: data.id, emailVerified: new Date() },
        select: USER_SELECT,
      });
    }
  }
  return prisma.user.create({
    data: {
      clerkId: data.id,
      email: identity.email ?? `${data.id}@clerk.local`,
      name: identity.name,
      image: identity.image,
      emailVerified: new Date(),
      // A brand-new account that is already banned has no prior role to log,
      // so no RoleChangeLog entry is written for the create itself.
      ...(banned ? { role: "BANNED" } : {}),
    },
    select: USER_SELECT,
  });
}

async function handleEvent(evt: ClerkUserEvent) {
  switch (evt.type) {
    case "user.created":
    case "user.updated":
      await upsertFromClerk(evt.data);
      return;
    case "user.deleted":
      // Keep the local account and its content; only detach the Clerk link so
      // a future re-signup with the same email can reclaim the row.
      await prisma.user.updateMany({
        where: { clerkId: evt.data.id },
        data: { clerkId: null },
      });
      return;
    default:
      return;
  }
}

export async function POST(req: Request) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;
  if (!WEBHOOK_SECRET) {
    return NextResponse.json(
      { error: "CLERK_WEBHOOK_SECRET is not configured" },
      { status: 503 }
    );
  }

  const svixId = req.headers.get("svix-id");
  const svixTimestamp = req.headers.get("svix-timestamp");
  const svixSignature = req.headers.get("svix-signature");
  if (!svixId || !svixTimestamp || !svixSignature) {
    return NextResponse.json({ error: "Missing svix headers" }, { status: 400 });
  }

  const body = await req.text();
  let evt: ClerkUserEvent;
  try {
    const wh = new Webhook(WEBHOOK_SECRET);
    evt = wh.verify(body, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    }) as unknown as ClerkUserEvent;
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    await handleEvent(evt);
  } catch (error) {
    // Clerk retries failed deliveries, so surface the error.
    console.error("clerk webhook handling failed", evt.type, error);
    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
