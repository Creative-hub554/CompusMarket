import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@theo/database";
import bcrypt from "bcryptjs";
import { rateLimit } from "@/lib/rateLimit";
import { sendMail } from "@/lib/mail";
import { randomToken, sha256 } from "@/lib/authTokens";
import { SITE_NAME, getSiteUrl } from "@/lib/site";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_NAME_LENGTH = 100;
const VERIFY_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

export async function POST(req: NextRequest) {
  if (!rateLimit(req.headers, 10)) {
    return NextResponse.json({ error: "Too many requests. Try again later." }, { status: 429 });
  }

  try {
    const { email, password, name, locale } = await req.json();

    if (typeof email !== "string" || !EMAIL_REGEX.test(email.trim())) {
      return NextResponse.json({ error: "A valid email is required" }, { status: 400 });
    }

    if (typeof password !== "string" || password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
    }

    if (typeof name !== "string" || !name.trim()) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }
    if (name.trim().length > MAX_NAME_LENGTH) {
      return NextResponse.json({ error: "Name is too long" }, { status: 400 });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const pref =
      typeof locale === "string" && /^[a-z]{2}$/.test(locale) ? locale : "km";

    const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existing) {
      return NextResponse.json({ error: "Email already registered" }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        email: normalizedEmail,
        name: name.trim(),
        passwordHash,
        role: "CUSTOMER",
      },
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
    const mail = await sendMail({
      to: user.email,
      subject: `Verify your ${SITE_NAME} email`,
      text: `Confirm this is your email to finish setting up your ${SITE_NAME} account:\n\n${verifyUrl}\n\nThis link is valid for 24 hours.`,
      html: `<p>Confirm this is your email to finish setting up your ${SITE_NAME} account:</p><p><a href="${verifyUrl}">Verify my email</a> (valid for 24 hours).</p>`,
    });

    return NextResponse.json(
      { id: user.id, email: user.email, name: user.name, verification: { sent: mail.delivered, devUrl: mail.delivered ? undefined : verifyUrl } },
      { status: 201 }
    );
  } catch {
    return NextResponse.json({ error: "Registration failed" }, { status: 500 });
  }
}