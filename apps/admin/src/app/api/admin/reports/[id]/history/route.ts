import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/require-admin";
import { prisma } from "@theo/database";

/**
 * Audit trail for one report: every resolution action taken on it, newest
 * first (bounded to the last 100 entries to keep the page light).
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireAdmin(req, ["ADMIN"]);
  if (!guard.ok) return guard.response;

  const { id } = await params;

  const report = await prisma.report.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!report) {
    return NextResponse.json({ error: "Report not found" }, { status: 404 });
  }

  const entries = await prisma.reportResolutionLog.findMany({
    where: { reportId: id },
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true,
      action: true,
      fromStatus: true,
      toStatus: true,
      notes: true,
      createdAt: true,
      resolvedBy: {
        select: { id: true, name: true, email: true, image: true },
      },
    },
  });

  return NextResponse.json(entries);
}
