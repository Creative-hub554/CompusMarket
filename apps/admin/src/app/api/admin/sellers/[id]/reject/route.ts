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
  const { notes } = await req.json();

  const profile = await prisma.sellerProfile.findUnique({
    where: { id },
    include: { user: { select: { name: true, email: true } } },
  });
  if (!profile) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.sellerProfile.update({
    where: { id },
    data: {
      verificationStatus: "REJECTED",
      reviewedBy: guard.user.id,
      reviewNotes: notes || null,
    },
  });

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const noteBlock = notes ? `\n\nReason: ${notes}` : "";
  sendMail({
    to: profile.user.email,
    subject: "Update on your seller application",
    text: `Hi ${profile.user.name || "there"},\n\nWe've reviewed your seller application on KhmerShop, and unfortunately we were unable to approve it at this time.${noteBlock}\n\nYou can review your application and re-apply at: ${siteUrl}/seller/apply\n\nBest regards,\nThe KhmerShop Team`,
  }).catch(() => {});

  return NextResponse.json({ success: true });
}
