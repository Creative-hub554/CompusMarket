import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@theo/database";

export async function GET(req: NextRequest) {
  const token = await getToken({ req });
  if (token?.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const since30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [
    totalUsers,
    totalProducts,
    totalCategories,
    activeSellers,
    pendingSellerApps,
    pendingWarrantyClaims,
    openSupportTickets,
    lowStockProducts,
    orderGroups,
    recentOrders,
    topProductsAgg,
    revenueAgg,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.product.count(),
    prisma.category.count(),
    prisma.sellerProfile.count({ where: { verificationStatus: "APPROVED" } }),
    prisma.sellerProfile.count({ where: { verificationStatus: "PENDING" } }),
    prisma.warranty.count({ where: { claimStatus: "PENDING" } }),
    prisma.supportTicket.count({ where: { status: { not: "CLOSED" } } }),
    prisma.product.findMany({
      where: { status: "ACTIVE", stock: { lte: 3 } },
      select: { id: true, name: true, stock: true },
      orderBy: { stock: "asc" },
      take: 5,
    }),
    prisma.order.groupBy({
      by: ["status"],
      _count: { _all: true },
    }),
    prisma.order.findMany({
      where: { createdAt: { gte: since30d }, status: { not: "CANCELLED" } },
      select: { createdAt: true, total: true },
    }),
    prisma.orderItem.groupBy({
      by: ["productId"],
      where: { status: { notIn: ["CANCELLED", "REJECTED"] } },
      _sum: { quantity: true },
      orderBy: { _sum: { quantity: "desc" } },
      take: 5,
    }),
    prisma.order.aggregate({
      where: { status: { not: "CANCELLED" } },
      _sum: { total: true },
    }),
  ]);

  const topProductIds = topProductsAgg.map((t) => t.productId);
  const topProducts = await prisma.product.findMany({
    where: { id: { in: topProductIds } },
    select: { id: true, name: true },
  });
  const topProductName = new Map(topProducts.map((p) => [p.id, p.name]));

  const byDay = new Map<string, { revenue: number; orders: number }>();
  for (const order of recentOrders) {
    const key = order.createdAt.toISOString().slice(0, 10);
    const entry = byDay.get(key) || { revenue: 0, orders: 0 };
    entry.revenue += Number(order.total);
    entry.orders += 1;
    byDay.set(key, entry);
  }
  const ordersPerDay = Array.from(byDay.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, v]) => ({ date, ...v }));

  const ordersByStatus = orderGroups.map((g) => ({
    status: g.status,
    count: g._count._all,
  }));

  return NextResponse.json({
    totalUsers,
    totalProducts,
    totalCategories,
    activeSellers,
    pendingSellerApps,
    pendingWarrantyClaims,
    openSupportTickets,
    lowStockProducts,
    totalRevenue: revenueAgg._sum.total ? Number(revenueAgg._sum.total) : 0,
    revenueLast30Days: ordersPerDay.reduce((s, d) => s + d.revenue, 0),
    ordersPerDay,
    ordersByStatus,
    topProducts: topProductsAgg
      .map((t) => ({
        productId: t.productId,
        name: topProductName.get(t.productId) || "Unknown",
        units: t._sum.quantity || 0,
      }))
      .filter((p) => p.units > 0),
  });
}
