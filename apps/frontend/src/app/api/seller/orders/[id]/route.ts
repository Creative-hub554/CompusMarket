import { NextRequest, NextResponse } from "next/server";
import { getToken } from "@/lib/auth";
import { prisma } from "@theo/database";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const token = await getToken({ req });
  if (!token?.sub) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const uid = token.sub as string;

  const { id } = await params;

  const profile = await prisma.sellerProfile.findUnique({
    where: { userId: uid },
  });
  if (!profile || profile.verificationStatus !== "APPROVED") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      user: { select: { name: true, email: true } },
      items: {
        where: { product: { sellerId: profile.id } },
        include: {
          product: { select: { name: true, images: true, price: true } },
          feedback: true,
        },
      },
    },
  });

  if (!order || order.items.length === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(order);
}
