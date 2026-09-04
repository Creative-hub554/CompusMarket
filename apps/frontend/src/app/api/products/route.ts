import { NextRequest, NextResponse } from "next/server";
import { getToken } from "@/lib/auth";
import { prisma, ProductCondition } from "@theo/database";

export async function POST(req: NextRequest) {
  const token = await getToken({ req });
  if (!token?.sub) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const uid = token.sub as string;

  let body;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  if (token.role === "SELLER") {
    const profile = await prisma.sellerProfile.findUnique({
      where: { userId: uid },
    });
    if (!profile || profile.verificationStatus !== "APPROVED") {
      return NextResponse.json({ error: "Seller not approved" }, { status: 403 });
    }

    const productCount = await prisma.product.count({
      where: { sellerId: profile.id },
    });

    const maxProducts = profile.accountType === "BUSINESS" ? 10 : 5;
    if (productCount >= maxProducts) {
      return NextResponse.json(
        { error: `Product limit reached (${maxProducts})` },
        { status: 400 },
      );
    }

    const price = parseFloat(body.price);
    const stock = parseInt(body.stock || "1", 10);
    if (!body.name || !body.name.trim()) {
      return NextResponse.json({ error: "Product name is required" }, { status: 400 });
    }
    if (isNaN(price) || price <= 0) {
      return NextResponse.json({ error: "Valid price is required" }, { status: 400 });
    }
    if (isNaN(stock) || stock < 0) {
      return NextResponse.json({ error: "Valid stock is required" }, { status: 400 });
    }

    const validConditions = Object.values(ProductCondition) as string[];
    if (!body.condition || !validConditions.includes(body.condition)) {
      return NextResponse.json({ error: "Valid condition is required" }, { status: 400 });
    }

    if (typeof body.categoryId !== "string" || !body.categoryId.trim()) {
      return NextResponse.json({ error: "Category is required" }, { status: 400 });
    }

    if (body.description !== undefined && typeof body.description !== "string") {
      return NextResponse.json({ error: "Description must be a string" }, { status: 400 });
    }
    if (typeof body.description === "string" && body.description.length > 5000) {
      return NextResponse.json({ error: "Description is too long (max 5000 characters)" }, { status: 400 });
    }

    const images = body.images ?? [];
    if (!Array.isArray(images) || !images.every((img: unknown) => typeof img === "string")) {
      return NextResponse.json({ error: "Images must be an array of strings" }, { status: 400 });
    }

    const product = await prisma.product.create({
      data: {
        name: body.name.trim(),
        description: body.description,
        price,
        condition: body.condition,
        categoryId: body.categoryId.trim(),
        stock,
        images,
        sellerId: profile.id,
      },
      include: { category: true },
    });

    return NextResponse.json(product, { status: 201 });
  }

  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}
