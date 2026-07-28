import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@theo/database";

export async function GET(req: NextRequest) {
  const token = await getToken({ req });
  if (!token?.sub || (token.role !== "ADMIN" && token.role !== "CONTENT_EDITOR")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const articles = await prisma.article.findMany({
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(articles);
}

export async function POST(req: NextRequest) {
  const token = await getToken({ req });
  if (!token?.sub || (token.role !== "ADMIN" && token.role !== "CONTENT_EDITOR")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const article = await prisma.article.create({
    data: {
      title: body.title,
      slug: body.slug,
      content: body.content,
      excerpt: body.excerpt || "",
      category: body.category,
      tags: body.tags || [],
      authorId: token.sub,
    },
  });

  return NextResponse.json(article, { status: 201 });
}
