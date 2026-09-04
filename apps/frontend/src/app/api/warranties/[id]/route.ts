import { NextRequest, NextResponse } from "next/server";
import { getToken } from "@/lib/auth";
import { prisma } from "@theo/database";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = await getToken({ req });
  if (!token?.sub) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const uid = token.sub as string;

  const { id } = await params;

  const warranty = await prisma.warranty.findUnique({
    where: { id },
    include: {
      product: true,
      orderItem: { include: { order: true } },
    },
  });

  if (!warranty) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (warranty.userId !== uid) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json(warranty);
}
