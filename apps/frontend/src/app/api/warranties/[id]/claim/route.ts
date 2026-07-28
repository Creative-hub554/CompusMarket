import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma, WarrantyStatus, WarrantyClaimStatus } from "@theo/database";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = await getToken({ req });
  if (!token?.sub) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const uid = token.sub as string;

  const { id } = await params;

  let body;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  const { reason } = body;
  if (!reason?.trim()) {
    return NextResponse.json({ error: "Reason is required" }, { status: 400 });
  }

  const warranty = await prisma.warranty.findUnique({ where: { id } });

  if (!warranty) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (warranty.userId !== uid) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (warranty.status !== WarrantyStatus.ACTIVE) {
    return NextResponse.json({ error: "Warranty is not active" }, { status: 400 });
  }

  if (new Date() > warranty.endDate) {
    await prisma.warranty.update({
      where: { id },
      data: { status: WarrantyStatus.EXPIRED },
    });
    return NextResponse.json({ error: "Warranty has expired" }, { status: 400 });
  }

  const updated = await prisma.warranty.update({
    where: { id },
    data: {
      status: WarrantyStatus.CLAIMED,
      claimDate: new Date(),
      claimReason: reason,
      claimStatus: WarrantyClaimStatus.PENDING,
    },
    include: {
      product: { select: { name: true } },
    },
  });

  return NextResponse.json(updated);
}
