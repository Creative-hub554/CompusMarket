import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@theo/database";
import { requireAdmin } from "@/lib/require-admin";

export async function GET(req: NextRequest) {
  const guard = await requireAdmin(req, ["ADMIN"]);
  if (!guard.ok) return guard.response;

  const [bannerGroups, bannerPaymentGroups, campaigns, videoViews, videoAds] =
    await Promise.all([
      prisma.bannerAd.groupBy({
        by: ["slot"],
        _count: { _all: true },
        _sum: { totalPrice: true },
      }),
      prisma.bannerAd.groupBy({
        by: ["paymentStatus"],
        _count: { _all: true },
      }),
      prisma.campaign.groupBy({
        by: ["status"],
        _count: { _all: true },
        _sum: { dailyBudget: true, lifetimeBudget: true },
      }),
      prisma.videoAdView.groupBy({
        by: ["billed"],
        _count: { _all: true },
      }),
      prisma.videoAd.findMany({
        select: { id: true, durationSeconds: true, cpv: true, currency: true, _count: { select: { views: true } } },
        orderBy: { createdAt: "desc" },
        take: 10,
      }),
    ]);

  const billedViews = videoViews.find((entry) => entry.billed)?._count._all ?? 0;
  const totalViews = videoViews.reduce((sum, entry) => sum + entry._count._all, 0);

  return NextResponse.json({
    bannersBySlot: bannerGroups.map((entry) => ({
      slot: entry.slot,
      count: entry._count._all,
      bookedValue: entry._sum.totalPrice ? Number(entry._sum.totalPrice) : 0,
    })),
    bannerPayments: bannerPaymentGroups.map((entry) => ({
      status: entry.paymentStatus,
      count: entry._count._all,
    })),
    campaigns: campaigns.map((entry) => ({
      status: entry.status,
      count: entry._count._all,
      dailyBudget: entry._sum.dailyBudget ? Number(entry._sum.dailyBudget) : 0,
      lifetimeBudget: entry._sum.lifetimeBudget ? Number(entry._sum.lifetimeBudget) : 0,
    })),
    videoViews: { total: totalViews, billed: billedViews, unbilled: totalViews - billedViews },
    recentVideoAds: videoAds.map((ad) => ({
      id: ad.id,
      durationSeconds: ad.durationSeconds,
      cpv: Number(ad.cpv),
      currency: ad.currency,
      views: ad._count.views,
    })),
  });
}
