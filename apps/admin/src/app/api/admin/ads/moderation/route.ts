import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@theo/database";
import { requireAdmin } from "@/lib/require-admin";

export async function GET(req: NextRequest) {
  const guard = await requireAdmin(req, ["ADMIN"]);
  if (!guard.ok) return guard.response;

  const [banners, videos] = await Promise.all([
    prisma.bannerAd.findMany({
      where: { moderationStatus: "PENDING" },
      orderBy: { createdAt: "asc" },
      include: { user: { select: { name: true, email: true } } },
    }),
    prisma.videoAd.findMany({
      where: { moderationStatus: "PENDING" },
      orderBy: { createdAt: "asc" },
      include: { user: { select: { name: true, email: true } } },
    }),
  ]);

  return NextResponse.json({ banners, videos });
}

export async function PATCH(req: NextRequest) {
  const guard = await requireAdmin(req, ["ADMIN"]);
  if (!guard.ok) return guard.response;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const type = body.type === "banner" || body.type === "video" ? body.type : null;
  const id = typeof body.id === "string" ? body.id : "";
  const status = ["APPROVED", "REJECTED", "PAUSED"].includes(String(body.status))
    ? String(body.status)
    : null;
  if (!type || !id || !status) {
    return NextResponse.json({ error: "Valid type, id, and status are required" }, { status: 400 });
  }

  const ad = type === "banner"
    ? await prisma.bannerAd.update({ where: { id }, data: { moderationStatus: status } })
    : await prisma.videoAd.update({ where: { id }, data: { moderationStatus: status } });
  return NextResponse.json(ad);
}
