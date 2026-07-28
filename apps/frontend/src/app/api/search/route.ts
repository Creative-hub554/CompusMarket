import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@theo/database";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get("q") || "";
  const categoryId = searchParams.get("categoryId");
  const minPrice = searchParams.get("minPrice");
  const maxPrice = searchParams.get("maxPrice");

  const where: any = {
    OR: [
      { name: { contains: query } },
      { description: { contains: query } },
    ],
  };

  if (categoryId) where.categoryId = categoryId;
  if (minPrice || maxPrice) {
    where.price = {};
    if (minPrice) where.price.gte = Number(minPrice);
    if (maxPrice) where.price.lte = Number(maxPrice);
  }

  const products = await prisma.product.findMany({
    where,
    include: { category: true },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return NextResponse.json({
    hits: products.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      price: p.price,
      condition: p.condition,
      status: p.status,
      categoryId: p.categoryId,
      categoryName: p.category.name,
      images: p.images,
    })),
    total: products.length,
    query,
    source: "prisma",
  });
}