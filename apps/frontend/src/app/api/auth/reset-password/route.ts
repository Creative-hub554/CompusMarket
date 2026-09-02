import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@theo/database";
import bcrypt from "bcryptjs";
import { rateLimit } from "@/lib/rateLimit";
import { sha256 } from "@/lib/authTokens";

const MIN_PASSWORD = 8;

export async function POST(req: NextRequest) {
  if (!rateLimit(req.headers, 5)) {
    return NextResponse.json({ error: "Too many requests. Try again later." }, { status: 429 });
  }

  try {
    const { token, password } = await req.json();
    if (typeof token !== "string" || !token) {
      return NextResponse.json({ error: "A valid reset token is required" }, { status: 400 });
    }
    if (typeof password !== "string" || password.length < MIN_PASSWORD) {
      return NextResponse.json(
        { error: `Password must be at least ${MIN_PASSWORD} characters` },
        { status: 400 }
      );
    }

    const stored = await prisma.passwordResetToken.findUnique({
      where: { tokenHash: sha256(token) },
    });
    if (!stored || stored.usedAt || stored.expiresAt < new Date()) {
      return NextResponse.json(
        { error: "This reset link is invalid or has expired." },
        { status: 400 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);
    await prisma.$transaction([
      prisma.passwordResetToken.update({
        where: { id: stored.id },
        data: { usedAt: new Date() },
      }),
      prisma.user.update({ where: { id: stored.userId }, data: { passwordHash } }),
      prisma.refreshToken.updateMany({
        where: { userId: stored.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed to reset password" }, { status: 500 });
  }
}