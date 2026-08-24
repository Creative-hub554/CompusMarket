import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/require-admin";
import { prisma } from "@theo/database";

export async function GET(req: NextRequest) {
  const guard = await requireAdmin(req, ["ADMIN"]);
  if (!guard.ok) return guard.response;

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim();
  const role = searchParams.get("role");

  const where: Record<string, unknown> = {};
  if (role) where.role = role;
  if (q) {
    where.OR = [
      { email: { contains: q } },
      { name: { contains: q } },
      { username: { contains: q } },
    ];
  }

  const users = await prisma.user.findMany({
    where,
    select: {
      id: true,
      email: true,
      name: true,
      username: true,
      image: true,
      role: true,
      createdAt: true,
      _count: { select: { orders: true, posts: true, articles: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return NextResponse.json(users);
}
