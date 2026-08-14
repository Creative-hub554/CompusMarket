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
  const { notes } = await req.json();

  const profile = await prisma.sellerProfile.findUnique({ where: { id } });
  if (!profile) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.sellerProfile.update({
    where: { id },
    data: {
      verificationStatus: "REJECTED",
      reviewedBy: guard.user.id,
      reviewNotes: notes || null,
    },
  });

  return NextResponse.json({ success: true });
}
