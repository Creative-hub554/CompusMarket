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

  const post = await prisma.post.findUnique({ where: { id }, select: { id: true } });
  if (!post) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.post.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
