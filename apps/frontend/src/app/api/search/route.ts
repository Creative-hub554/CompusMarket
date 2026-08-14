import { NextRequest, NextResponse } from "next/server";
import { prisma, Prisma } from "@theo/database";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get("q") || "";
  const categoryId = searchParams.get("categoryId");
  const minPrice = searchParams.get("minPrice");
  const maxPrice = searchParams.get("maxPrice");
  const inStock = searchParams.get("inStock") === "true";

  const where: Prisma.ProductWhereInput = {
    status: "ACTIVE",
    OR: [
      { name: { contains: query, mode: "insensitive" } },
      { description: { contains: query, mode: "insensitive" } },
    ],
  };

  if (categoryId) where.categoryId = categoryId;
  if (inStock) where.stock = { gt: 0 };

  const min = minPrice !== null ? Number(minPrice) : NaN;
  const max = maxPrice !== null ? Number(maxPrice) : NaN;

  if (minPrice !== null && !Number.isFinite(min)) {
    return NextResponse.json({ error: "Invalid minPrice" }, { status: 400 });
  }
  if (maxPrice !== null && !Number.isFinite(max)) {
    return NextResponse.json({ error: "Invalid maxPrice" }, { status: 400 });
  }

  if (minPrice !== null || maxPrice !== null) {
    where.price = {};
    if (minPrice !== null) where.price.gte = min;
    if (maxPrice !== null) where.price.lte = max;
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