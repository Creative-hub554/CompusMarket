import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/require-admin";
import { prisma } from "@theo/database";

export async function GET(req: NextRequest) {
  const guard = await requireAdmin(req, ["ADMIN", "CONTENT_EDITOR"]);
  if (!guard.ok) return guard.response;

  const articles = await prisma.article.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return NextResponse.json(articles);
}

export async function POST(req: NextRequest) {
  const guard = await requireAdmin(req, ["ADMIN", "CONTENT_EDITOR"]);
  if (!guard.ok) return guard.response;

  const body = await req.json();
  const article = await prisma.article.create({
    data: {
      title: body.title,
      slug: body.slug,
      content: body.content,
      excerpt: body.excerpt || "",
      category: body.category,
      tags: body.tags || [],
      authorId: guard.user.id,
    },
  });

  return NextResponse.json(article, { status: 201 });
}
