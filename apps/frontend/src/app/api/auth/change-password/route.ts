import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@theo/database";
import bcrypt from "bcryptjs";
import { rateLimit } from "@/lib/rateLimit";

const MIN_PASSWORD = 8;

export async function POST(req: NextRequest) {
  if (!rateLimit(req.headers, 10)) {
    return NextResponse.json({ error: "Too many requests. Try again later." }, { status: 429 });
  }
  const token = await getToken({ req });
  if (!token?.sub) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { currentPassword, newPassword } = await req.json();

    if (typeof currentPassword !== "string" || !currentPassword) {
      return NextResponse.json({ error: "Current password is required" }, { status: 400 });
    }
    if (typeof newPassword !== "string" || newPassword.length < MIN_PASSWORD) {
      return NextResponse.json(
        { error: `Password must be at least ${MIN_PASSWORD} characters` },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({ where: { id: token.sub } });
    if (!user?.passwordHash) {
      return NextResponse.json({ error: "Account has no password set" }, { status: 400 });
    }

    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) {
      return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await prisma.$transaction([
      prisma.user.update({ where: { id: user.id }, data: { passwordHash } }),
      // Forcing re-auth elsewhere — revoke every active refresh token.
      prisma.refreshToken.updateMany({
        where: { userId: user.id, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed to update password" }, { status: 500 });
  }
}