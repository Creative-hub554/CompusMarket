import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/require-admin";
import { prisma } from "@theo/database";

const ROLES = [
  "CUSTOMER",
  "CONTENT_EDITOR",
  "INVENTORY_MANAGER",
  "SELLER",
  "ADMIN",
  "BANNED",
] as const;

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireAdmin(req, ["ADMIN"]);
  if (!guard.ok) return guard.response;

  const { id } = await params;

  // Admins can never modify themselves (no self-demotion/self-ban lockout)
  // nor other admins (protected against lockout when only one admin exists).
  if (id === guard.user.id) {
    return NextResponse.json(
      { error: "You cannot modify your own account" },
      { status: 400 },
    );
  }

  const target = await prisma.user.findUnique({
    where: { id },
    select: { id: true, role: true },
  });
  if (!target) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (target.role === "ADMIN") {
    return NextResponse.json(
      { error: "Admin accounts are protected" },
      { status: 400 },
    );
  }

  const body = (await req.json().catch(() => null)) as { role?: string } | null;
  const role = body?.role;
  if (!role || !ROLES.includes(role as (typeof ROLES)[number])) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }

  const user = await prisma.user.update({
    where: { id },
    data: { role: role as (typeof ROLES)[number] },
    select: { id: true, email: true, role: true },
  });

  // Banning kills every active session: revoke all refresh tokens so the
  // banned user cannot mint new access tokens.
  if (role === "BANNED") {
    await prisma.refreshToken.updateMany({
      where: { userId: id, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  return NextResponse.json(user);
}
