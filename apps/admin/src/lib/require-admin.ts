import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@theo/database";

export type AdminUser = { id: string; role: string };

export type RequireAdminResult =
  | { ok: true; user: AdminUser }
  | { ok: false; response: NextResponse };

/**
 * Verifies the request is from an authenticated user whose CURRENT role in the
 * database is allowed. Unlike checking `token.role`, this does not trust the
 * role claim embedded in the JWT, so demoted/banned users lose access
 * immediately instead of after the token expires.
 */
export async function requireAdmin(
  req: NextRequest,
  allowedRoles: readonly string[] = ["ADMIN"],
): Promise<RequireAdminResult> {
  const token = await getToken({ req });
  if (!token?.sub) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }

  const user = await prisma.user.findUnique({
    where: { id: token.sub },
    select: { id: true, role: true },
  });

  if (!user || !allowedRoles.includes(user.role)) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }

  return { ok: true, user };
}
