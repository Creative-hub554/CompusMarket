import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/require-admin";
import { prisma } from "@theo/database";
import { sendMail } from "@/lib/mail";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireAdmin(req, ["ADMIN"]);
  if (!guard.ok) return guard.response;

  const { id } = await params;

  const profile = await prisma.sellerProfile.findUnique({
    where: { id },
    include: { user: { select: { name: true, email: true } } },
  });
  if (!profile) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.$transaction([
    prisma.sellerProfile.update({
      where: { id },
      data: {
        verificationStatus: "APPROVED",
        reviewedBy: guard.user.id,
        verifiedAt: new Date(),
      },
    }),
    prisma.user.update({
      where: { id: profile.userId },
      data: { role: "SELLER" },
    }),
  ]);

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  sendMail({
    to: profile.user.email,
    subject: "Your seller application has been approved",
    text: `Hi ${profile.user.name || "there"},\n\nCongratulations! Your seller application on KhmerShop has been approved. You can now list products and manage your shop from your seller dashboard.\n\nGo to your dashboard: ${siteUrl}/seller/dashboard\n\nBest regards,\nThe KhmerShop Team`,
  }).catch(() => {});

  return NextResponse.json({ success: true });
}
