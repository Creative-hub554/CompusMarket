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

// Sentence shown to each reporter whose report was closed by an account ban,
// phrased to read after the acting admin's name in the notification bell.
const BAN_RESOLUTION_MESSAGE = "banned the account you reported.";

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
  // Notices for reporters whose open reports are closed by this ban; pushed
  // to live sockets after commit, like the notice to the banned user.
  let reporterRelays: {
    userId: string;
    actorId: string;
    kind: "REPORT_RESOLVED";
    message: string;
  }[] = [];

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

    // A fresh ban also resolves every open report against the account — the
    // same rule as a content takedown closing reports on its target. Each
    // report is closed as REMOVED with an audit entry in the same transaction,
    // and its reporter is notified. Resubmitting BANNED is a no-op, so only an
    // actual transition to BANNED triggers this.
    if (toRole === "BANNED" && fromRole !== toRole) {
      const open = await tx.report.findMany({
        where: { targetType: "USER", targetId: id, status: "PENDING" },
        select: { id: true, reporterId: true },
      });
      if (open.length > 0) {
        const ids = open.map((r) => r.id);
        await tx.report.updateMany({
          where: { id: { in: ids } },
          data: { status: "REMOVED", reviewedBy: guard.user.id },
        });
        await tx.reportResolutionLog.createMany({
          data: ids.map((reportId) => ({
            reportId,
            resolvedById: guard.user.id,
            action: "CONTENT_REMOVED",
            fromStatus: "PENDING",
            toStatus: "REMOVED",
            notes: null,
          })),
        });
        // Tell each reporter their report is closed; skip reports filed by the
        // acting admin or by the banned user themselves (they get their own
        // ACCOUNT_BANNED notice instead).
        const reporters = open.filter(
          (r) => r.reporterId !== guard.user.id && r.reporterId !== id,
        );
        if (reporters.length > 0) {
          await tx.notification.createMany({
            data: reporters.map((r) => ({
              userId: r.reporterId,
              actorId: guard.user.id,
              kind: "REPORT_RESOLVED",
              message: BAN_RESOLUTION_MESSAGE,
            })),
          });
          reporterRelays = reporters.map((r) => ({
            userId: r.reporterId,
            actorId: guard.user.id,
            kind: "REPORT_RESOLVED" as const,
            message: BAN_RESOLUTION_MESSAGE,
          }));
        }
      }
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
  if (reporterRelays.length > 0) void pushNotificationDeliveries(reporterRelays);

  return NextResponse.json(user);
}
