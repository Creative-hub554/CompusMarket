import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@theo/database";
import { rateLimit } from "@/lib/rateLimit";
import { sendMail } from "@/lib/mail";
import { randomToken, sha256 } from "@/lib/authTokens";
import { SITE_NAME, getSiteUrl } from "@/lib/site";

const RESET_TTL_MS = 60 * 60 * 1000; // 1 hour

export async function POST(req: NextRequest) {
  if (!rateLimit(req.headers, 5)) {
    return NextResponse.json({ error: "Too many requests. Try again later." }, { status: 429 });
  }

  try {
    const { email, locale } = await req.json();
    if (typeof email !== "string" || !email.trim()) {
      return NextResponse.json({ error: "An email is required" }, { status: 400 });
    }
    const normalized = email.trim().toLowerCase();
    const pref =
      typeof locale === "string" && /^[a-z]{2}$/.test(locale) ? locale : "km";

    const user = await prisma.user.findUnique({ where: { email: normalized } });
    // Never reveal whether an account exists — always return the same shape.
    if (!user?.passwordHash) {
      return NextResponse.json({ ok: true });
    }

    // One live reset link at a time.
    await prisma.passwordResetToken.deleteMany({ where: { userId: user.id, usedAt: null } });

    const token = randomToken();
    await prisma.passwordResetToken.create({
      data: {
        tokenHash: sha256(token),
        userId: user.id,
        expiresAt: new Date(Date.now() + RESET_TTL_MS),
      },
    });

    const resetUrl = `${getSiteUrl()}/${pref}/reset-password?token=${encodeURIComponent(token)}`;
    const result = await sendMail({
      to: user.email,
      subject: `Reset your ${SITE_NAME} password`,
      text: `Someone requested a password reset for ${user.email}. Open this link within 1 hour to choose a new password:\n\n${resetUrl}\n\nIf you didn't request this, you can ignore this email.`,
      html: `<p>Someone requested a password reset for <strong>${user.email}</strong>.</p><p><a href="${resetUrl}">Choose a new password</a> (valid for 1 hour).</p><p>If you didn't request this, you can safely ignore this email.</p>`,
    });

    // Dev mode (no SMTP): surface the link so the flow stays testable.
    return NextResponse.json({
      ok: true,
      devUrl: result.delivered ? undefined : resetUrl,
    });
  } catch {
    return NextResponse.json({ ok: true });
  }
}