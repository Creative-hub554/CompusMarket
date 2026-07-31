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

  const products = await prisma.product.findMany({
    where: { sellerId: profile.id },
    include: { category: true },
    orderBy: { createdAt: "desc" },
  });

  const maxProducts = profile.accountType === "BUSINESS" ? 10 : 5;

  return NextResponse.json({
    products,
    count: products.length,
    maxProducts,
    accountType: profile.accountType,
  });
}
