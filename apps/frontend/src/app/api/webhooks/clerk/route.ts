import { NextResponse } from "next/server";
import { Webhook } from "svix";
import { clerkClient } from "@clerk/nextjs/server";
import { prisma } from "@theo/database";

/**
 * Clerk user lifecycle events synced into the local database. Roles remain
 * DB-authoritative (clerkId is only the link), so this endpoint mirrors
 * identity fields — and Clerk bans, which map onto the BANNED role. Unbanning
 * is deliberately NOT automatic: only an admin changing the role in the app
 * can restore access.
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

async function upsertFromClerk(data: ClerkUserEvent["data"]) {
  const { email, name, image } = identityOf(data);
  if (data.banned) {
    void syncBanMetadata(data.id);
  }
  const existing = await prisma.user.findUnique({
    where: { clerkId: data.id },
    select: USER_SELECT,
  });

  if (existing) {
    return prisma.user.update({
      where: { id: existing.id },
      data: {
        ...(email ? { email } : {}),
        ...(name ? { name } : {}),
        ...(image ? { image } : {}),
        emailVerified: existing.emailVerified ?? new Date(),
        ...(data.banned ? { role: "BANNED" } : {}),
      },
    });
  }

  // No local row yet: create it, or claim a pre-Clerk account with the same
  // (Clerk-verified) email when it is not already linked elsewhere.
  if (email) {
    const byEmail = await prisma.user.findUnique({
      where: { email },
      select: USER_SELECT,
    });
    if (byEmail) {
      if (byEmail.clerkId === null) {
        return prisma.user.update({
          where: { id: byEmail.id },
          data: { clerkId: data.id, emailVerified: new Date() },
        });
      }
      // Linked to another Clerk user: leave it; provisioning will resolve.
      return byEmail;
    }
  }
  return prisma.user.create({
    data: {
      clerkId: data.id,
      email: email ?? `${data.id}@clerk.local`,
      name,
      image,
      emailVerified: new Date(),
      ...(data.banned ? { role: "BANNED" } : {}),
    },
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
