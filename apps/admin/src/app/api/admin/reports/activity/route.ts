import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/require-admin";
import { prisma } from "@theo/database";

/**
 * Global admin activity feed of report resolutions: the most recent
 * approve/dismiss/remove-content actions across all reports, with the acting
 * admin and a summary of the report (its target and reporter).
 */
export async function GET(req: NextRequest) {
  const guard = await requireAdmin(req, ["ADMIN"]);
  if (!guard.ok) return guard.response;

  const { searchParams } = new URL(req.url);
  const rawLimit = searchParams.get("limit");
  const raw = rawLimit === null ? Number.NaN : Number(rawLimit);
  const limit = Number.isFinite(raw)
    ? Math.min(Math.max(Math.trunc(raw), 1), 50)
    : 10;

  const entries = await prisma.reportResolutionLog.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      action: true,
      notes: true,
      createdAt: true,
      resolvedBy: {
        select: { id: true, name: true, email: true, image: true },
      },
      report: {
        select: {
          id: true,
          targetType: true,
          targetId: true,
          reason: true,
          status: true,
          reporter: {
            select: { id: true, name: true, email: true },
          },
        },
      },
    },
  });

  return NextResponse.json(entries);
}
