import { Prisma } from "@theo/database";

export type CloseReportOpts = {
  tx: Prisma.TransactionClient;
  targetType: "USER" | "POST" | "COMMENT" | "PRODUCT";
  targetId: string;
  resolvedById: string;
  notes: string | null;
  /** Outcome sentence shown to each notified reporter (after the admin's name). */
  message: string;
  /** Reporters who must not be notified — e.g. the acting admin, or the banned user themselves. */
  excludeReporterIds?: string[];
};

export type ReportRelay = {
  userId: string;
  actorId: string;
  kind: "REPORT_RESOLVED";
  message: string;
};

/**
 * Closes every open report against a target as REMOVED — the content-takedown
 * rule, and the same rule used when an account is banned. Status flip, audit
 * rows, and reporter notifications all run in the caller's transaction so the
 * trail can never drift from the rows. Returns the counts and the relay
 * payloads to push to live sockets (by the caller, after commit).
 */
export async function closeOpenReports(
  opts: CloseReportOpts,
): Promise<{ resolvedCount: number; relays: ReportRelay[] }> {
  const {
    tx,
    targetType,
    targetId,
    resolvedById,
    notes,
    message,
    excludeReporterIds = [],
  } = opts;

  const open = await tx.report.findMany({
    where: { targetType, targetId, status: "PENDING" },
    select: { id: true, reporterId: true },
  });
  if (open.length === 0) return { resolvedCount: 0, relays: [] };

  const ids = open.map((r) => r.id);
  await tx.report.updateMany({
    where: { id: { in: ids } },
    data: {
      status: "REMOVED",
      reviewedBy: resolvedById,
      ...(notes !== null ? { adminNotes: notes } : {}),
    },
  });
  await tx.reportResolutionLog.createMany({
    data: ids.map((reportId) => ({
      reportId,
      resolvedById,
      action: "CONTENT_REMOVED",
      fromStatus: "PENDING",
      toStatus: "REMOVED",
      notes,
    })),
  });

  const toNotify = open.filter(
    (r) => !excludeReporterIds.includes(r.reporterId),
  );
  if (toNotify.length > 0) {
    await tx.notification.createMany({
      data: toNotify.map((r) => ({
        userId: r.reporterId,
        actorId: resolvedById,
        kind: "REPORT_RESOLVED",
        message,
      })),
    });
  }

  return {
    resolvedCount: ids.length,
    relays: toNotify.map((r) => ({
      userId: r.reporterId,
      actorId: resolvedById,
      kind: "REPORT_RESOLVED" as const,
      message,
    })),
  };
}
