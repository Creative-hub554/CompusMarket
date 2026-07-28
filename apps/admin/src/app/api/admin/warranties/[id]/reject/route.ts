import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma, WarrantyClaimStatus } from "@theo/database";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = await getToken({ req });
  if (!token?.sub || token.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

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
