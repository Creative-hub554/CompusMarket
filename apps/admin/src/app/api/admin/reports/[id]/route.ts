import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/require-admin";
import { prisma } from "@theo/database";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireAdmin(req, ["ADMIN"]);
  if (!guard.ok) return guard.response;

  const { id } = await params;
  const body = await req.json();
  const { status, adminNotes } = body as {
    status?: string;
    adminNotes?: string;
  };

  const report = await prisma.report.findUnique({ where: { id } });
  if (!report) {
    return NextResponse.json({ error: "Report not found" }, { status: 404 });
  }

  const update: Record<string, unknown> = {};
  if (status && ["PENDING", "REVIEWED", "DISMISSED"].includes(status)) {
    update.status = status;
  }
  if (adminNotes !== undefined) update.adminNotes = adminNotes;
  update.reviewedBy = guard.user.id;

  const updated = await prisma.report.update({ where: { id }, data: update });
  return NextResponse.json(updated);
}