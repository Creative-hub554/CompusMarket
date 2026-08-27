import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@theo/database";

export async function GET(req: NextRequest) {
  const token = await getToken({ req });
  if (!token?.sub) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [campaigns, banners] = await Promise.all([
    prisma.campaign.findMany({
      where: { userId: token.sub },
      orderBy: { createdAt: "desc" },
      select: {
        id: true, objective: true, dailyBudget: true, lifetimeBudget: true,
        currency: true, startAt: true, endAt: true, status: true,
        paymentStatus: true, moderationStatus: true, stripePaymentId: true,
      },
    }),
    prisma.bannerAd.findMany({
      where: { userId: token.sub },
      orderBy: { createdAt: "desc" },
      select: {
        id: true, slot: true, startAt: true, durationMinutes: true,
        totalPrice: true, currency: true, paymentStatus: true,
        moderationStatus: true, stripePaymentId: true, imageUrl: true,
        videoUrl: true, title: true,
      },
    }),
  ]);

  const bannerIds = banners.map((item) => item.id);
  const eventGroups = bannerIds.length
    ? await prisma.bannerAdEvent.groupBy({
        by: ["bannerAdId", "type"],
        where: { bannerAdId: { in: bannerIds } },
        _count: { _all: true },
      })
    : [];
  const eventCounts = new Map(eventGroups.map((item) => [`${item.bannerAdId}:${item.type}`, item._count._all]));

  return NextResponse.json({
    campaigns: campaigns.map((item) => ({
      ...item,
      dailyBudget: Number(item.dailyBudget),
      lifetimeBudget: item.lifetimeBudget === null ? null : Number(item.lifetimeBudget),
    })),
    banners: banners.map((item) => ({
      ...item,
      totalPrice: Number(item.totalPrice),
      impressions: eventCounts.get(`${item.id}:IMPRESSION`) || 0,
      clicks: eventCounts.get(`${item.id}:CLICK`) || 0,
    })),
  });
}

export async function PATCH(req: NextRequest) {
  const token = await getToken({ req });
  if (!token?.sub) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const type = body.type === "campaign" || body.type === "banner" ? body.type : null;
  const id = typeof body.id === "string" ? body.id : "";
  const status = String(body.status || "");
  if (!type || !id) return NextResponse.json({ error: "Ad type and id are required" }, { status: 400 });

  if (type === "campaign") {
    if (!["PAUSED", "CANCELLED"].includes(status)) {
      return NextResponse.json({ error: "Campaign can only be paused or cancelled" }, { status: 400 });
    }
    const campaign = await prisma.campaign.updateMany({
      where: { id, userId: token.sub },
      data: { status },
    });
    if (!campaign.count) return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  } else {
    if (status !== "PAUSED") {
      return NextResponse.json({ error: "Banner can only be paused" }, { status: 400 });
    }
    const banner = await prisma.bannerAd.updateMany({
      where: { id, userId: token.sub },
      data: { moderationStatus: "PAUSED" },
    });
    if (!banner.count) return NextResponse.json({ error: "Banner not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
