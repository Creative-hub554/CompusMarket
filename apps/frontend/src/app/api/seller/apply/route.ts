import { NextRequest, NextResponse } from "next/server";
import { getToken } from "@/lib/auth";
import { prisma } from "@theo/database";

export async function GET(req: NextRequest) {
  const token = await getToken({ req });
  if (!token?.sub) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const uid = token.sub as string;

  const profile = await prisma.sellerProfile.findUnique({
    where: { userId: uid },
    include: { documents: true },
  });

  return NextResponse.json(profile);
}

export async function POST(req: NextRequest) {
  const token = await getToken({ req });
  if (!token?.sub) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const uid = token.sub as string;

  let body;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  const { accountType, phone, address, documents } = body;

  if (!accountType || !["PERSONAL", "BUSINESS"].includes(accountType)) {
    return NextResponse.json({ error: "Invalid account type" }, { status: 400 });
  }

  if (!documents?.length) {
    return NextResponse.json({ error: "At least one document required" }, { status: 400 });
  }

  try {
  const [profile] = await prisma.$transaction(async (tx) => {
    const existing = await tx.sellerProfile.findUnique({ where: { userId: uid } });
    if (existing) {
      throw new Error("Application already exists");
    }

    const profile = await tx.sellerProfile.create({
      data: {
        userId: uid,
        accountType,
        phone,
        address,
        documents: {
          create: documents.map((doc: { type: string; url: string; filename: string }) => ({
            type: doc.type,
            url: doc.url,
            filename: doc.filename,
          })),
        },
      },
      include: { documents: true },
    });

    return [profile];
  });

  return NextResponse.json(profile, { status: 201 });
  } catch (e: any) {
    if (e.message === "Application already exists") {
      return NextResponse.json({ error: "Application already exists" }, { status: 409 });
    }
    return NextResponse.json({ error: "Failed to submit application" }, { status: 500 });
  }
}
