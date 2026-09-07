import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { prisma } from "@theo/database";

const DEFAULT_ADMIN_ROLES = ["ADMIN", "CONTENT_EDITOR"] as const;

/**
 * Server-component guard for /admin pages. Middleware only checks
 * authentication (edge runtime, no Postgres); this helper re-checks the
 * CURRENT database role on every page render, so demoted or banned users lose
 * access immediately instead of after a token/session expires.
 *
 * - No Clerk session        -> redirect to /sign-in
 * - No local user / bad role -> redirect to /forbidden
 */
export async function requireAdminPage(
  allowedRoles: readonly string[] = DEFAULT_ADMIN_ROLES
): Promise<{ id: string; role: string }> {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
    select: { id: true, role: true },
  });

  if (!user || !allowedRoles.includes(user.role)) redirect("/forbidden");

  return user;
}