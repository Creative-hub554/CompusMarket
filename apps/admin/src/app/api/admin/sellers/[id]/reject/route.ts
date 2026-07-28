import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@theo/database";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const token = await getToken({ req });
  if (!token?.sub || token.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const { notes } = await req.json();

  const profile = await prisma.sellerProfile.findUnique({ where: { id } });
  if (!profile) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.sellerProfile.update({
    where: { id },
    data: {
      verificationStatus: "REJECTED",
      reviewedBy: token.sub,
      reviewNotes: notes || null,
    },
  });

  return NextResponse.json({ success: true });
}
