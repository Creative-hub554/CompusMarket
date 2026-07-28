import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@theo/database";

export async function GET(req: NextRequest) {
  const token = await getToken({ req });
  if (!token?.sub || token.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");

  const where = status ? { verificationStatus: status as any } : {};

  const profiles = await prisma.sellerProfile.findMany({
    where,
    include: {
      user: { select: { name: true, email: true, createdAt: true } },
      documents: true,
      _count: { select: { products: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(profiles);
}
