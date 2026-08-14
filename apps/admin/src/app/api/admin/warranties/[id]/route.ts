import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/require-admin";
import { prisma } from "@theo/database";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireAdmin(req, ["ADMIN"]);
  if (!guard.ok) return guard.response;

  const { id } = await params;
  const warranty = await prisma.warranty.findUnique({
    where: { id },
    include: {
      product: true,
      user: { select: { name: true, email: true } },
      orderItem: { include: { order: true } },
    },
  });

  if (!warranty) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(warranty);
}
