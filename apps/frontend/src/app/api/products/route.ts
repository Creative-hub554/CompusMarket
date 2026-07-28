import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@theo/database";

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
    const stock = parseInt(body.stock || "1");
    if (!body.name || !body.name.trim()) {
      return NextResponse.json({ error: "Product name is required" }, { status: 400 });
    }
    if (isNaN(price) || price <= 0) {
      return NextResponse.json({ error: "Valid price is required" }, { status: 400 });
    }
    if (isNaN(stock) || stock < 0) {
      return NextResponse.json({ error: "Valid stock is required" }, { status: 400 });
    }

    const product = await prisma.product.create({
      data: {
        name: body.name.trim(),
        description: body.description,
        price,
        condition: body.condition,
        categoryId: body.categoryId,
        stock,
        images: body.images || [],
        sellerId: profile.id,
      },
      include: { category: true },
    });

    return NextResponse.json(product, { status: 201 });
  }

  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}
