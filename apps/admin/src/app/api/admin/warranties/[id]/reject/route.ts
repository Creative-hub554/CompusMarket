import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/require-admin";
import { prisma, WarrantyClaimStatus } from "@theo/database";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireAdmin(req, ["ADMIN"]);
  if (!guard.ok) return guard.response;

  const { id } = await params;
  const warranty = await prisma.warranty.findUnique({ where: { id } });
  if (!warranty) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (warranty.claimStatus !== WarrantyClaimStatus.PENDING) {
    return NextResponse.json({ error: "Claim is not pending" }, { status: 400 });
  }

  const updated = await prisma.warranty.update({
    where: { id },
    data: { claimStatus: WarrantyClaimStatus.REJECTED },
  });

  return NextResponse.json(updated);
}
