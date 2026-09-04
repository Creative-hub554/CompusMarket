import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/require-admin";
import { pushNotificationDeliveries } from "@/lib/notification-push";
import { prisma } from "@theo/database";

const ROLES = [
  "CUSTOMER",
  "CONTENT_EDITOR",
  "INVENTORY_MANAGER",
  "SELLER",
  "ADMIN",
  "BANNED",
] as const;
type RoleValue = (typeof ROLES)[number];

const ROLE_LABELS: Record<string, string> = {
  CUSTOMER: "Customer",
  CONTENT_EDITOR: "Content Editor",
  INVENTORY_MANAGER: "Inventory Manager",
  SELLER: "Seller",
  ADMIN: "Admin",
  BANNED: "Banned",
};

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
  if (!role || !ROLES.includes(role as RoleValue)) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }
  const toRole = role as RoleValue;
  const fromRole = target.role as RoleValue;

  let notify: {
    userId: string;
    actorId: string;
    kind: "ACCOUNT_BANNED" | "ROLE_CHANGED";
    message: string;
  } | null = null;

  const user = await prisma.$transaction(async (tx) => {
    const updated = await tx.user.update({
      where: { id },
      data: { role: toRole },
      select: { id: true, email: true, role: true },
    });

    // Banning kills every active session: revoke all refresh tokens so the
    // banned user cannot mint new access tokens.
    if (toRole === "BANNED") {
      await tx.refreshToken.updateMany({
        where: { userId: id, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }

    // Keep the affected user in the loop when their role actually changed. The
    // row is written in the same transaction so a change can never happen
    // without the notice; the relay after commit makes it arrive instantly.
    if (fromRole !== toRole) {
      const message =
        toRole === "BANNED"
          ? "banned your account."
          : fromRole === "BANNED"
            ? "restored your account."
            : `set your role to ${ROLE_LABELS[toRole] ?? toRole}.`;
      notify = {
        userId: id,
        actorId: guard.user.id,
        kind: toRole === "BANNED" ? "ACCOUNT_BANNED" : "ROLE_CHANGED",
        message,
      };
      await tx.notification.create({ data: notify });
    }
    return updated;
  });

  // Best-effort: push to live sockets only after the rows are committed.
  if (notify) void pushNotificationDeliveries([notify]);

  return NextResponse.json(user);
}
