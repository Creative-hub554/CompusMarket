import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@theo/database";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ itemId: string }> },
) {
  const token = await getToken({ req });
  if (!token?.sub) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const uid = token.sub as string;

  const { itemId } = await params;
  let body;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  const { status, trackingNumber } = body;

  const profile = await prisma.sellerProfile.findUnique({
    where: { userId: uid },
  });
  if (!profile || profile.verificationStatus !== "APPROVED") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const item = await prisma.orderItem.findUnique({
    where: { id: itemId },
    include: { product: true },
  });

  if (!item || item.product.sellerId !== profile.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const VALID_TRANSITIONS: Record<string, string[]> = {
    PENDING: ["APPROVED", "REJECTED", "CANCELLED"],
    APPROVED: ["PACKING", "CANCELLED"],
    PACKING: ["SHIPPED", "CANCELLED"],
    SHIPPED: ["DELIVERED"],
    DELIVERED: [],
    REJECTED: [],
    CANCELLED: [],
  };

  const allowed = VALID_TRANSITIONS[item.status];
  if (!allowed || !allowed.includes(status)) {
    return NextResponse.json(
      { error: `Cannot transition from ${item.status} to ${status}` },
      { status: 400 },
    );
  }

  const updateData: Record<string, any> = { status };
  if (status === "SHIPPED") {
    updateData.shippedAt = new Date();
    if (trackingNumber) updateData.trackingNumber = trackingNumber;
  } else if (status === "PACKING") {
    updateData.packedAt = new Date();
  } else if (status === "DELIVERED") {
    updateData.deliveredAt = new Date();
  }

  const updated = await prisma.orderItem.update({
    where: { id: itemId },
    data: updateData,
    include: { product: { select: { name: true, images: true } } },
  });

  return NextResponse.json(updated);
}
