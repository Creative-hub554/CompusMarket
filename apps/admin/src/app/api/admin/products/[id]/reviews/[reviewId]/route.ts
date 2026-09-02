import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/require-admin";
import { prisma } from "@theo/database";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; reviewId: string }> },
) {
  const guard = await requireAdmin(req, ["ADMIN"]);
  if (!guard.ok) return guard.response;

  const { reviewId } = await params;

  const review = await prisma.review.findUnique({ where: { id: reviewId } });
  if (!review) {
    return NextResponse.json({ error: "Review not found" }, { status: 404 });
  }

  await prisma.review.delete({ where: { id: reviewId } });

  return NextResponse.json({ success: true });
}