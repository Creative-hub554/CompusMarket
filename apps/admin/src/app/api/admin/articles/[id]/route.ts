import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/require-admin";
import { prisma } from "@theo/database";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireAdmin(req, ["ADMIN", "CONTENT_EDITOR"]);
  if (!guard.ok) return guard.response;

  const { id } = await params;

  const article = await prisma.article.findUnique({
    where: { id },
    include: { author: { select: { name: true } } },
  });
  if (!article) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(article);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireAdmin(req, ["ADMIN", "CONTENT_EDITOR"]);
  if (!guard.ok) return guard.response;

  const { id } = await params;
  const body = await req.json();

  const article = await prisma.article.findUnique({ where: { id } });
  if (!article) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const updated = await prisma.article.update({
    where: { id },
    data: {
      ...(body.title && { title: body.title }),
      ...(body.slug && { slug: body.slug }),
      ...(body.content && { content: body.content }),
      ...(body.excerpt !== undefined && { excerpt: body.excerpt }),
      ...(body.category && { category: body.category }),
      ...(body.tags && { tags: body.tags }),
      ...(body.published !== undefined && { published: body.published }),
    },
  });

  return NextResponse.json(updated);
}
