import { NextRequest, NextResponse } from "next/server";
import { getToken } from "@/lib/auth";
import { prisma } from "@theo/database";

const SELLER_EDITABLE_STATUSES = ["ACTIVE", "DISABLED"];

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const token = await getToken({ req });
  if (!token?.sub) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const uid = token.sub as string;

  const { id } = await params;

  const profile = await prisma.sellerProfile.findUnique({
    where: { userId: uid },
  });
  if (!profile || profile.verificationStatus !== "APPROVED") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const product = await prisma.product.findUnique({
    where: { id },
    include: { category: true },
  });

  if (!product || product.sellerId !== profile.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(product);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const token = await getToken({ req });
  if (!token?.sub) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const uid = token.sub as string;

  const { id } = await params;

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const profile = await prisma.sellerProfile.findUnique({
    where: { userId: uid },
  });
  if (!profile || profile.verificationStatus !== "APPROVED") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const product = await prisma.product.findUnique({ where: { id } });
  if (!product || product.sellerId !== profile.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const data: Record<string, unknown> = {};

  if (body.name !== undefined) {
    const name = String(body.name).trim();
    if (!name) return NextResponse.json({ error: "Product name is required" }, { status: 400 });
    data.name = name;
  }

  if (body.description !== undefined) data.description = String(body.description);
  if (body.condition !== undefined) data.condition = String(body.condition);
  if (body.categoryId !== undefined) data.categoryId = String(body.categoryId);

  if (body.price !== undefined) {
    const price = parseFloat(body.price);
    if (isNaN(price) || price <= 0) {
      return NextResponse.json({ error: "Valid price is required" }, { status: 400 });
    }
    data.price = price;
  }

  if (body.stock !== undefined) {
    const stock = parseInt(body.stock);
    if (isNaN(stock) || stock < 0) {
      return NextResponse.json({ error: "Valid stock is required" }, { status: 400 });
    }
    data.stock = stock;
  }

  if (body.images !== undefined) {
    if (!Array.isArray(body.images) || body.images.length > 5) {
      return NextResponse.json({ error: "Maximum 5 images per product" }, { status: 400 });
    }
    data.images = body.images.filter((i: unknown) => typeof i === "string");
  }

  if (body.warrantyMonths !== undefined) {
    const months = parseInt(body.warrantyMonths);
    data.warrantyMonths = isNaN(months) || months < 0 ? null : months;
  }

  if (body.serialNumber !== undefined) data.serialNumber = String(body.serialNumber);

  if (body.videoUrl !== undefined) {
    const videoUrl = String(body.videoUrl).trim();
    if (videoUrl && !/^https?:\/\/.+/i.test(videoUrl)) {
      return NextResponse.json({ error: "Video URL must start with http(s)://" }, { status: 400 });
    }
    if (videoUrl.length > 2048) {
      return NextResponse.json({ error: "Video URL is too long" }, { status: 400 });
    }
    data.videoUrl = videoUrl || null;
  }

  if (body.videoActive !== undefined) {
    data.videoActive = Boolean(body.videoActive);
    // A promo cannot be active without a video behind it.
    if (data.videoActive && !data.videoUrl && !product.videoUrl) {
      return NextResponse.json(
        { error: "Upload a promo video before activating it" },
        { status: 400 },
      );
    }
  }

  if (body.status !== undefined) {
    if (!SELLER_EDITABLE_STATUSES.includes(String(body.status))) {
      return NextResponse.json(
        { error: "Sellers can only set status to ACTIVE or DISABLED" },
        { status: 400 },
      );
    }
    data.status = String(body.status);
  }

  const updated = await prisma.product.update({
    where: { id },
    data,
    include: { category: true },
  });

  return NextResponse.json(updated);
}
