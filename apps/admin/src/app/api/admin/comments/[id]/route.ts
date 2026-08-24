import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/require-admin";
import { prisma } from "@theo/database";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireAdmin(req, ["ADMIN"]);
  if (!guard.ok) return guard.response;

  const { id } = await params;

  const comment = await prisma.comment.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!comment) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.comment.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
