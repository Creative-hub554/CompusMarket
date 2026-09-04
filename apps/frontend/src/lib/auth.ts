import { auth, clerkClient } from "@clerk/nextjs/server";
import { prisma } from "@theo/database";

/**
 * The local user as the rest of the app knows it: the DB uuid (sub) is what
 * every route, guard, and the backend JWT expect, so Clerk sessions are
 * translated here to the matching local record. Roles and bans stay in the
 * database — the Clerk user is only the identity provider.
 */
export type LocalUser = {
  sub: string;
  email: string;
  name: string | null;
  image: string | null;
  role: string;
};

const USER_SELECT = {
  id: true,
  email: true,
  name: true,
  image: true,
  role: true,
} as const;

/**
 * A first-time Clerk sign-in has no local account yet (the sync webhook may
 * lag or not be configured), so provision one lazily from the Clerk profile.
 * clerkId is unique, so a racing webhook create simply loses the create and
 * we fall back to reading the row.
 */
async function provisionUser(userId: string): Promise<LocalUser | null> {
  let email = `${userId}@clerk.local`;
  let name: string | null = null;
  let image: string | null = null;
  try {
    const client = await clerkClient();
    const clerkUser = await client.users.getUser(userId);
    email =
      clerkUser.emailAddresses.find((e) => e.verification?.status === "verified")
        ?.emailAddress ??
      clerkUser.emailAddresses[0]?.emailAddress ??
      `${userId}@clerk.local`;
    name =
      [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ").trim() ||
      null;
    image = clerkUser.imageUrl || null;
    const user = await prisma.user.create({
      data: { clerkId: userId, email, name, image, emailVerified: new Date() },
      select: USER_SELECT,
    });
    return {
      sub: user.id,
      email: user.email,
      name: user.name,
      image: user.image,
      role: user.role,
    };
  } catch {
    // Concurrent provisioning or a Clerk API hiccup. Prefer the row the
    // webhook just created; otherwise adopt a pre-Clerk account that shares
    // the (Clerk-verified) email, linking it only when unclaimed.
    const byClerk = await prisma.user.findUnique({
      where: { clerkId: userId },
      select: USER_SELECT,
    });
    if (byClerk) {
      return {
        sub: byClerk.id,
        email: byClerk.email,
        name: byClerk.name,
        image: byClerk.image,
        role: byClerk.role,
      };
    }
    const byEmail = await prisma.user.findUnique({
      where: { email },
      select: { ...USER_SELECT, clerkId: true, emailVerified: true },
    });
    if (byEmail && (byEmail.clerkId === null || byEmail.clerkId === userId)) {
      const linked = await prisma.user.update({
        where: { id: byEmail.id },
        data: {
          clerkId: userId,
          image: byEmail.image ?? image,
          emailVerified: byEmail.emailVerified ?? new Date(),
        },
        select: USER_SELECT,
      });
      return {
        sub: linked.id,
        email: linked.email,
        name: linked.name,
        image: linked.image,
        role: linked.role,
      };
    }
    return null;
  }
}

async function resolveLocalUser(): Promise<LocalUser | null> {
  const { userId } = await auth();
  if (!userId) return null;

  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
    select: USER_SELECT,
  });
  if (!user) {
    return provisionUser(userId);
  }
  // A banned account is treated as unauthenticated, mirroring NextAuth.
  if (user.role === "BANNED") return null;

  return {
    sub: user.id,
    email: user.email,
    name: user.name,
    image: user.image,
    role: user.role,
  };
}

/**
 * Drop-in replacement for `getToken` from next-auth/jwt. Route handlers keep
 * calling it with `({ req })`; the argument is accepted and ignored.
 */
export async function getToken(
  _opts?: { req?: unknown } | undefined
): Promise<LocalUser | null> {
  return resolveLocalUser();
}

/** Alias for route handlers that previously called getServerSession(). */
export async function getServerSession(): Promise<LocalUser | null> {
  return resolveLocalUser();
}

/** Whether the caller is signed in as a local user at all. */
export async function isAuthed(): Promise<boolean> {
  return (await resolveLocalUser()) !== null;
}
