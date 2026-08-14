import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/require-admin";
import { prisma } from "@theo/database";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireAdmin(req, ["ADMIN"]);
  if (!guard.ok) return guard.response;

  const { id } = await params;
  const { notes } = await req.json();

  const warranty = await prisma.warranty.findUnique({ where: { id } });
  if (!warranty) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const updated = await prisma.warranty.update({
    where: { id },
    data: { notes },
  });

  return NextResponse.json(updated);
}
