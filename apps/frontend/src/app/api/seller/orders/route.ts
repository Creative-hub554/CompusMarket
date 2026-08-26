import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@theo/database";

export async function GET(req: NextRequest) {
  const token = await getToken({ req });
  if (!token?.sub) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const uid = token.sub as string;

  const profile = await prisma.sellerProfile.findUnique({
    where: { userId: uid },
  });
  if (!profile || profile.verificationStatus !== "APPROVED") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const items = await prisma.orderItem.findMany({
    where: { product: { sellerId: profile.id } },
    include: {
      order: {
        include: { user: { select: { name: true, email: true } } },
      },
      product: { select: { name: true, images: true, price: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return NextResponse.json(items);
}
