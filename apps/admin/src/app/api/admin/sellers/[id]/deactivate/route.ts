import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/require-admin";
import { prisma } from "@theo/database";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireAdmin(req, ["ADMIN"]);
  if (!guard.ok) return guard.response;

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const reason = (body.reason as string) || (body.notes as string) || undefined;

  const profile = await prisma.sellerProfile.findUnique({ where: { id } });
  if (!profile) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.$transaction([
    prisma.sellerProfile.update({
      where: { id },
      data: {
        verificationStatus: "REJECTED",
        reviewNotes: reason || "Deactivated by admin",
        reviewedBy: guard.user.id,
      },
    }),
    prisma.user.update({
      where: { id: profile.userId },
      data: { role: "CUSTOMER" },
    }),
    prisma.product.updateMany({
      where: { sellerId: id },
      data: { status: "DISABLED" },
    }),
  ]);

  return NextResponse.json({ success: true });
}