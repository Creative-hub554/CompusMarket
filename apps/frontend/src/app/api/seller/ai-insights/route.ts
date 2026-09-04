import { NextRequest, NextResponse } from "next/server";
import { getToken } from "@/lib/auth";
import jwt from "jsonwebtoken";
import { prisma } from "@theo/database";
import { getApiBase } from "@/lib/apiBase";

export async function POST(req: NextRequest) {
  const token = await getToken({ req });
  if (!token?.sub) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const uid = token.sub as string;

  const profile = await prisma.sellerProfile.findUnique({
    where: { userId: uid },
  });
  if (!profile || profile.verificationStatus !== "APPROVED") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { lang } = await req.json().catch(() => ({}));
  const pref = lang === "km" ? "km" : "en";

  const JWT_SECRET: string =
    process.env.JWT_SECRET || process.env.AUTH_SECRET || "";
  if (!JWT_SECRET) {
    return NextResponse.json(
      { error: "JWT_SECRET or AUTH_SECRET must be configured" },
      { status: 500 }
    );
  }

  const authHeader = `Bearer ${jwt.sign({ sub: uid }, JWT_SECRET, { expiresIn: "5m" })}`;

  try {
    const res = await fetch(`${getApiBase()}/ai/seller-insights`, {
      method: "POST",
      headers: {
        authorization: authHeader,
        "content-type": "application/json",
      },
      body: JSON.stringify({ lang: pref }),
      cache: "no-store",
    });
    const body = await res.json().catch(() => ({}));
    return NextResponse.json(body, { status: res.status });
  } catch {
    return NextResponse.json(
      { error: "AI service is unavailable right now." },
      { status: 502 }
    );
  }
}