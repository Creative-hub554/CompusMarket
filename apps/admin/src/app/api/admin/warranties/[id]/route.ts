import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@theo/database";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = await getToken({ req });
  if (!token?.sub || token.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

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
