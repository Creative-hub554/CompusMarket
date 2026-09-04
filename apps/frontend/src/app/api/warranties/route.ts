import { NextRequest, NextResponse } from "next/server";
import { getToken } from "@/lib/auth";
import { prisma, WarrantyStatus, WarrantyClaimStatus } from "@theo/database";

export async function GET(req: NextRequest) {
  const token = await getToken({ req });
  if (!token?.sub) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const uid = token.sub as string;

  const warranties = await prisma.warranty.findMany({
    where: { userId: uid },
    include: {
      product: { select: { name: true, images: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(warranties);
}


