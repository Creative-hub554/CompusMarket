import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/require-admin";
import { pushNotificationDeliveries } from "@/lib/notification-push";
import { closeOpenReports } from "@/lib/report-resolution";
import { prisma } from "@theo/database";

/**
 * The report-resolution actions an admin can take. Each resolution writes a
 * ReportResolutionLog row (the audit trail + activity-feed source) in the same
 * transaction as the status change, so the trail can never drift from the row.
 *
 * - APPROVED       → the content is judged fine; the report is closed (REVIEWED).
 * - DISMISSED      → the report itself is unfounded/unactionable (DISMISSED).
 * - CONTENT_REMOVED→ the reported content is taken down and every open report
 *                    against that target is closed as REMOVED.
 */
const ACTIONS = ["APPROVED", "DISMISSED", "CONTENT_REMOVED"] as const;
type Action = (typeof ACTIONS)[number];

const TO_STATUS: Record<Action, "REVIEWED" | "DISMISSED" | "REMOVED"> = {
  APPROVED: "REVIEWED",
  DISMISSED: "DISMISSED",
  CONTENT_REMOVED: "REMOVED",
};

// Outcome sentence shown to the reporter in their notification bell, phrased
// to read after the acting admin's name (e.g. “Kim removed the content…”).
const OUTCOME_MESSAGES: Record<Action, string> = {
  APPROVED: "reviewed your report — no further action is needed.",
  DISMISSED: "dismissed your report as unfounded.",
  CONTENT_REMOVED: "removed the content you reported.",
};

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireAdmin(req, ["ADMIN"]);
  if (!guard.ok) return guard.response;

  const { id } = await params;
  const body = (await req.json().catch(() => null)) as {
    action?: string;
    adminNotes?: string;
  } | null;

  const rawAction = body?.action;
  if (
    typeof rawAction !== "string" ||
    !(ACTIONS as readonly string[]).includes(rawAction)
  ) {
    return NextResponse.json(
      {
        error: `action must be one of: ${ACTIONS.join(", ")}`,
      },
      { status: 400 },
    );
  }
  const action = rawAction as Action;

  const notes =
    typeof body?.adminNotes === "string" && body.adminNotes.trim()
      ? body.adminNotes.trim()
      : null;

  const report = await prisma.report.findUnique({ where: { id } });
  if (!report) {
    return NextResponse.json({ error: "Report not found" }, { status: 404 });
  }
  if (report.status !== "PENDING") {
    return NextResponse.json(
      { error: "Report has already been resolved" },
      { status: 409 },
    );
  }
  if (action === "CONTENT_REMOVED" && report.targetType === "USER") {
    return NextResponse.json(
      {
        error:
          "Accounts are not removed from here — use the Users page to ban or restore the user.",
      },
      { status: 400 },
    );
  }

  const resolvedById = guard.user.id;
  const toStatus = TO_STATUS[action];

  // Removing content resolves every open report against the same target, not
  // just this one: once the item is gone the other reports are moot too.
  if (action === "CONTENT_REMOVED") {
    const { resolvedCount, relays } = await prisma.$transaction(async (tx) => {
      // Take the content down. Deletes are idempotent (deleteMany) so a target
      // already removed elsewhere does not fail the resolution. Products are
      // hidden instead of hard-deleted because order items reference them.
      switch (report.targetType) {
        case "POST":
          await tx.post.deleteMany({ where: { id: report.targetId } });
          break;
        case "COMMENT":
          await tx.comment.deleteMany({ where: { id: report.targetId } });
          break;
        case "PRODUCT":
          await tx.product.updateMany({
            where: { id: report.targetId },
            data: { status: "DISABLED" },
          });
          break;
      }

      return closeOpenReports({
        tx,
        targetType: report.targetType,
        targetId: report.targetId,
        resolvedById,
        notes,
        message: OUTCOME_MESSAGES.CONTENT_REMOVED,
        excludeReporterIds: [resolvedById],
      });
    });

    // Push to live sockets only after the rows are committed; best-effort.
    void pushNotificationDeliveries(relays);
    return NextResponse.json({ ok: true, resolved: resolvedCount });
  }

  const updated = await prisma.$transaction(async (tx) => {
    const row = await tx.report.update({
      where: { id },
      data: {
        status: toStatus,
        reviewedBy: resolvedById,
        ...(notes !== null ? { adminNotes: notes } : {}),
      },
      select: { id: true, status: true, reviewedBy: true },
    });
    await tx.reportResolutionLog.create({
      data: {
        reportId: id,
        resolvedById,
        action,
        fromStatus: report.status,
        toStatus,
        notes,
      },
    });

    // Keep the reporter in the loop about the outcome of their report.
    if (report.reporterId !== resolvedById) {
      await tx.notification.create({
        data: {
          userId: report.reporterId,
          actorId: resolvedById,
          kind: "REPORT_RESOLVED",
          message: OUTCOME_MESSAGES[action],
        },
      });
    }
    return row;
  });

  // Rows are committed — now push them to the reporter's live sockets
  // (best-effort; the polled bell is the fallback).
  if (report.reporterId !== resolvedById) {
    void pushNotificationDeliveries([
      {
        userId: report.reporterId,
        actorId: resolvedById,
        kind: "REPORT_RESOLVED",
        message: OUTCOME_MESSAGES[action],
      },
    ]);
  }

  return NextResponse.json({ ok: true, report: updated });
}
