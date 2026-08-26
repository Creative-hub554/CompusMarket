import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/require-admin";
import { prisma } from "@theo/database";

export async function GET(req: NextRequest) {
  const guard = await requireAdmin(req, ["ADMIN"]);
  if (!guard.ok) return guard.response;

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
    take: 200,
  });

  return NextResponse.json(profiles);
}
