import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/require-admin";
import { prisma } from "@theo/database";

export async function GET(req: NextRequest) {
  const guard = await requireAdmin(req, ["ADMIN"]);
  if (!guard.ok) return guard.response;

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") || undefined;
  const targetType = searchParams.get("targetType") || undefined;

  const where: Record<string, string> = {};
  if (status) where.status = status;
  if (targetType) where.targetType = targetType;

  const reports = await prisma.report.findMany({
    where,
    include: {
      reporter: { select: { id: true, name: true, email: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const counts = await prisma.report.groupBy({
    by: ["status"],
    _count: true,
  });

  return NextResponse.json({ reports, counts });
}