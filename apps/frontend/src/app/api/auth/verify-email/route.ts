import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@theo/database";
import { rateLimit } from "@/lib/rateLimit";
import { sendMail } from "@/lib/mail";
import { randomToken, sha256 } from "@/lib/authTokens";
import { SITE_NAME, getSiteUrl } from "@/lib/site";

const VERIFY_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

/** Consume a verification link clicked in the email, then redirect to a status page. */
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  const locale = req.nextUrl.searchParams.get("locale");
  const pref = typeof locale === "string" && /^[a-z]{2}$/.test(locale) ? locale : "km";

  if (typeof token !== "string" || !token) {
    return NextResponse.redirect(new URL(`/${pref}/verify-email?status=error`, getSiteUrl()));
  }

  const stored = await prisma.emailVerificationToken.findUnique({
    where: { tokenHash: sha256(token) },
  });
  if (!stored || stored.usedAt || stored.expiresAt < new Date()) {
    return NextResponse.redirect(new URL(`/${pref}/verify-email?status=error`, getSiteUrl()));
  }

  await prisma.$transaction([
    prisma.emailVerificationToken.update({
      where: { id: stored.id },
      data: { usedAt: new Date() },
    }),
    prisma.user.update({
      where: { id: stored.userId },
      data: { emailVerified: new Date() },
    }),
  ]);

  return NextResponse.redirect(new URL(`/${pref}/verify-email?status=success`, getSiteUrl()));
}

/** Resend the verification email to the signed-in user (dev mode returns the link). */
export async function POST(req: NextRequest) {
  if (!rateLimit(req.headers, 5)) {
    return NextResponse.json({ error: "Too many requests. Try again later." }, { status: 429 });
  }
  const token = await getToken({ req });
  if (!token?.sub) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { locale } = await req.json().catch(() => ({}));
    const pref =
      typeof locale === "string" && /^[a-z]{2}$/.test(locale) ? locale : "km";

    const user = await prisma.user.findUnique({ where: { id: token.sub } });
    if (!user || user.emailVerified) {
      return NextResponse.json({ error: "Email is already verified" }, { status: 400 });
    }

    await prisma.emailVerificationToken.deleteMany({
      where: { userId: user.id, usedAt: null },
    });
    const verifyToken = randomToken();
    await prisma.emailVerificationToken.create({
      data: {
        tokenHash: sha256(verifyToken),
        userId: user.id,
        expiresAt: new Date(Date.now() + VERIFY_TTL_MS),
      },
    });

    const verifyUrl = `${getSiteUrl()}/${pref}/verify-email?token=${encodeURIComponent(verifyToken)}&locale=${pref}`;
    const result = await sendMail({
      to: user.email,
      subject: `Verify your ${SITE_NAME} email`,
      text: `Confirm that this is your email address to finish setting up your account:\n\n${verifyUrl}\n\nThis link is valid for 24 hours.`,
      html: `<p>Confirm this is your email to finish setting up your ${SITE_NAME} account:</p><p><a href="${verifyUrl}">Verify my email</a> (valid for 24 hours).</p>`,
    });

    return NextResponse.json({
      ok: true,
      devUrl: result.delivered ? undefined : verifyUrl,
    });
  } catch {
    return NextResponse.json({ error: "Failed to send verification email" }, { status: 500 });
  }
}