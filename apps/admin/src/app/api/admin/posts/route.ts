import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/require-admin";
import { prisma } from "@theo/database";

export async function GET(req: NextRequest) {
  const guard = await requireAdmin(req, ["ADMIN"]);
  if (!guard.ok) return guard.response;

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim();
  const cursor = searchParams.get("cursor");

  const posts = await prisma.post.findMany({
    where: q ? { content: { contains: q } } : {},
    include: {
      author: {
        select: { id: true, name: true, username: true, image: true, role: true },
      },
      media: true,
      _count: { select: { comments: true, reactions: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 20,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });

  return NextResponse.json({
    posts,
    nextCursor: posts.length === 20 ? posts[posts.length - 1].id : null,
  });
}
