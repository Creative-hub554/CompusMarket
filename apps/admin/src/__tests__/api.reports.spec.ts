import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest, NextResponse } from "next/server";

const requireAdminMock = vi.hoisted(() => vi.fn());
const prismaMock = vi.hoisted(() => ({
  report: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    groupBy: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
  },
  reportResolutionLog: {
    findMany: vi.fn(),
    create: vi.fn(),
    createMany: vi.fn(),
  },
  post: {
    deleteMany: vi.fn(),
  },
  comment: {
    deleteMany: vi.fn(),
  },
  product: {
    updateMany: vi.fn(),
  },
  notification: {
    create: vi.fn(),
    createMany: vi.fn(),
  },
  $transaction: vi.fn(),
}));

vi.mock("@/lib/require-admin", () => ({
  requireAdmin: requireAdminMock,
}));

vi.mock("@theo/database", () => ({
  prisma: prismaMock,
}));

import { GET as listReports } from "@/app/api/admin/reports/route";
import { PATCH as resolveReport } from "@/app/api/admin/reports/[id]/route";
import { GET as reportHistory } from "@/app/api/admin/reports/[id]/history/route";
import { GET as reportActivity } from "@/app/api/admin/reports/activity/route";

const adminGuard = { ok: true as const, user: { id: "admin-1", role: "ADMIN" } };

function forbidden() {
  return { ok: false as const, response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
}

function req(url: string, init?: RequestInit) {
  return new NextRequest(`http://localhost${url}`, init);
}

const PENDING_REPORT = {
  id: "r1",
  reporterId: "u1",
  targetType: "POST",
  targetId: "p1",
  reason: "SPAM",
  message: null,
  status: "PENDING",
  adminNotes: null,
  reviewedBy: null,
};

function resolveReq(body: unknown) {
  return req("/api/admin/reports/r1", {
    method: "PATCH",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

const params = { params: Promise.resolve({ id: "r1" }) };

// Real-time relay: resolutions push to the backend's socket-relay endpoint.
const fetchMock = vi.fn();
const RELAY_URL = "http://localhost:4000/api/internal/notifications/deliver";

beforeEach(() => {
  vi.clearAllMocks();
  requireAdminMock.mockResolvedValue(adminGuard);
  prismaMock.notification.create.mockResolvedValue({ id: "n-1" });
  prismaMock.notification.createMany.mockResolvedValue({ count: 1 });
  // Interactive-transaction support: route handlers call
  // prisma.$transaction(async (tx) => …); the tx delegate is the same mock
  // object, so every call is observable on prismaMock.
  prismaMock.$transaction.mockImplementation((arg: unknown) => {
    if (typeof arg === "function") return Promise.resolve(arg(prismaMock));
    return Promise.all(arg as Promise<unknown>[]);
  });
  vi.stubEnv("INTERNAL_SERVICE_TOKEN", "test-token");
  vi.stubEnv("NEXT_PUBLIC_API_URL", "http://localhost:4000");
  fetchMock.mockResolvedValue({ ok: true, status: 204 } as unknown as Response);
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

async function expectRelayed(payloads: unknown[]) {
  await vi.waitFor(() => {
    expect(fetchMock).toHaveBeenCalledTimes(payloads.length);
  });
  fetchMock.mock.calls.forEach(([url, init], i) => {
    expect(url).toBe(RELAY_URL);
    expect((init as RequestInit).method).toBe("POST");
    expect((init as RequestInit).headers).toMatchObject({
      "Content-Type": "application/json",
      "x-internal-token": "test-token",
    });
    expect(JSON.parse(String((init as RequestInit).body))).toEqual(payloads[i]);
  });
}

describe("GET /api/admin/reports", () => {
  it("forbids non-admins", async () => {
    requireAdminMock.mockResolvedValue(forbidden());
    const res = await listReports(req("/api/admin/reports"));
    expect(res.status).toBe(403);
    expect(prismaMock.report.findMany).not.toHaveBeenCalled();
  });

  it("returns reports with reporter info and status counts", async () => {
    const reports = [
      { id: "r1", targetType: "POST", reason: "SPAM", status: "PENDING", reporter: { id: "u1", name: "User", email: "u@x.y" } },
    ];
    const counts = [{ status: "PENDING", _count: 1 }];
    prismaMock.report.findMany.mockResolvedValue(reports);
    prismaMock.report.groupBy.mockResolvedValue(counts);

    const res = await listReports(req("/api/admin/reports"));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.reports).toEqual(reports);
    expect(body.counts).toEqual(counts);
  });

  it("filters by status", async () => {
    prismaMock.report.findMany.mockResolvedValue([]);
    prismaMock.report.groupBy.mockResolvedValue([]);

    await listReports(req("/api/admin/reports?status=REVIEWED"));

    expect(prismaMock.report.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { status: "REVIEWED" },
      }),
    );
  });

  it("filters by targetType", async () => {
    prismaMock.report.findMany.mockResolvedValue([]);
    prismaMock.report.groupBy.mockResolvedValue([]);

    await listReports(req("/api/admin/reports?targetType=PRODUCT"));

    expect(prismaMock.report.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { targetType: "PRODUCT" },
      }),
    );
  });

  it("combines status and targetType filters", async () => {
    prismaMock.report.findMany.mockResolvedValue([]);
    prismaMock.report.groupBy.mockResolvedValue([]);

    await listReports(req("/api/admin/reports?status=PENDING&targetType=USER"));

    expect(prismaMock.report.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { status: "PENDING", targetType: "USER" },
      }),
    );
  });
});

describe("PATCH /api/admin/reports/[id]", () => {
  it("forbids non-admins", async () => {
    requireAdminMock.mockResolvedValue(forbidden());
    const res = await resolveReport(resolveReq({ action: "APPROVED" }), params);
    expect(res.status).toBe(403);
    expect(prismaMock.report.findUnique).not.toHaveBeenCalled();
  });

  it("rejects a missing or unknown action", async () => {
    const res = await resolveReport(resolveReq({ action: "DELETE_USER" }), params);
    expect(res.status).toBe(400);
    expect(prismaMock.report.findUnique).not.toHaveBeenCalled();

    const res2 = await resolveReport(resolveReq({}), params);
    expect(res2.status).toBe(400);
  });

  it("returns 404 for an unknown report", async () => {
    prismaMock.report.findUnique.mockResolvedValue(null);
    const res = await resolveReport(resolveReq({ action: "APPROVED" }), params);
    expect(res.status).toBe(404);
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it("refuses to resolve a report that is no longer pending", async () => {
    prismaMock.report.findUnique.mockResolvedValue({
      ...PENDING_REPORT,
      status: "REVIEWED",
    });

    const res = await resolveReport(resolveReq({ action: "APPROVED" }), params);

    expect(res.status).toBe(409);
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it("approves: marks the report reviewed and writes an APPROVED audit entry", async () => {
    prismaMock.report.findUnique.mockResolvedValue(PENDING_REPORT);
    prismaMock.report.update.mockResolvedValue({ id: "r1", status: "REVIEWED", reviewedBy: "admin-1" });
    prismaMock.reportResolutionLog.create.mockResolvedValue({ id: "log-1" });

    const res = await resolveReport(resolveReq({ action: "APPROVED" }), params);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual({ ok: true, report: { id: "r1", status: "REVIEWED", reviewedBy: "admin-1" } });
    expect(prismaMock.report.update).toHaveBeenCalledWith({
      where: { id: "r1" },
      data: { status: "REVIEWED", reviewedBy: "admin-1" },
      select: { id: true, status: true, reviewedBy: true },
    });
    expect(prismaMock.reportResolutionLog.create).toHaveBeenCalledWith({
      data: {
        reportId: "r1",
        resolvedById: "admin-1",
        action: "APPROVED",
        fromStatus: "PENDING",
        toStatus: "REVIEWED",
        notes: null,
      },
    });
    // The reporter is told the outcome.
    expect(prismaMock.notification.create).toHaveBeenCalledWith({
      data: {
        userId: "u1",
        actorId: "admin-1",
        kind: "REPORT_RESOLVED",
        message: "reviewed your report — no further action is needed.",
      },
    });
    // …and the row is relayed to the backend for instant socket delivery.
    await expectRelayed([
      {
        userId: "u1",
        actorId: "admin-1",
        kind: "REPORT_RESOLVED",
        message: "reviewed your report — no further action is needed.",
      },
    ]);
  });

  it("skips the real-time relay when no internal token is configured", async () => {
    vi.stubEnv("INTERNAL_SERVICE_TOKEN", "");
    prismaMock.report.findUnique.mockResolvedValue(PENDING_REPORT);
    prismaMock.report.update.mockResolvedValue({ id: "r1", status: "REVIEWED", reviewedBy: "admin-1" });
    prismaMock.reportResolutionLog.create.mockResolvedValue({ id: "log-1" });

    const res = await resolveReport(resolveReq({ action: "APPROVED" }), params);

    expect(res.status).toBe(200);
    // The row is still persisted (poll fallback) even though nothing was sent.
    expect(prismaMock.notification.create).toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("does not notify the reporter when the acting admin filed the report", async () => {
    prismaMock.report.findUnique.mockResolvedValue({
      ...PENDING_REPORT,
      reporterId: "admin-1",
    });
    prismaMock.report.update.mockResolvedValue({ id: "r1", status: "DISMISSED", reviewedBy: "admin-1" });
    prismaMock.reportResolutionLog.create.mockResolvedValue({ id: "log-1" });

    await resolveReport(resolveReq({ action: "DISMISSED" }), params);

    expect(prismaMock.notification.create).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("dismisses: marks the report dismissed and writes a DISMISSED audit entry", async () => {
    prismaMock.report.findUnique.mockResolvedValue(PENDING_REPORT);
    prismaMock.report.update.mockResolvedValue({ id: "r1", status: "DISMISSED", reviewedBy: "admin-1" });
    prismaMock.reportResolutionLog.create.mockResolvedValue({ id: "log-1" });

    const res = await resolveReport(resolveReq({ action: "DISMISSED" }), params);

    expect(res.status).toBe(200);
    expect(prismaMock.report.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: "DISMISSED", reviewedBy: "admin-1" } }),
    );
    expect(prismaMock.reportResolutionLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: "DISMISSED",
        fromStatus: "PENDING",
        toStatus: "DISMISSED",
      }),
    });
  });

  it("stores trimmed admin notes on both the report and the audit entry", async () => {
    prismaMock.report.findUnique.mockResolvedValue(PENDING_REPORT);
    prismaMock.report.update.mockResolvedValue({ id: "r1", status: "REVIEWED", reviewedBy: "admin-1" });
    prismaMock.reportResolutionLog.create.mockResolvedValue({ id: "log-1" });

    await resolveReport(resolveReq({ action: "APPROVED", adminNotes: "  looks fine  " }), params);

    expect(prismaMock.report.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ adminNotes: "looks fine" }) }),
    );
    expect(prismaMock.reportResolutionLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ notes: "looks fine" }),
    });
  });

  it("removes content: deletes a reported post and resolves every open report on it", async () => {
    prismaMock.report.findUnique.mockResolvedValue(PENDING_REPORT);
    prismaMock.report.findMany.mockResolvedValue([
      { id: "r1", reporterId: "u1" },
      { id: "r2", reporterId: "u2" },
    ]);
    prismaMock.post.deleteMany.mockResolvedValue({ count: 1 });
    prismaMock.report.updateMany.mockResolvedValue({ count: 2 });
    prismaMock.reportResolutionLog.createMany.mockResolvedValue({ count: 2 });

    const res = await resolveReport(resolveReq({ action: "CONTENT_REMOVED" }), params);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual({ ok: true, resolved: 2 });
    expect(prismaMock.report.findMany).toHaveBeenCalledWith({
      where: { targetType: "POST", targetId: "p1", status: "PENDING" },
      select: { id: true, reporterId: true },
    });
    expect(prismaMock.post.deleteMany).toHaveBeenCalledWith({ where: { id: "p1" } });
    expect(prismaMock.report.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ["r1", "r2"] } },
      data: { status: "REMOVED", reviewedBy: "admin-1" },
    });
    expect(prismaMock.reportResolutionLog.createMany).toHaveBeenCalledWith({
      data: [
        {
          reportId: "r1",
          resolvedById: "admin-1",
          action: "CONTENT_REMOVED",
          fromStatus: "PENDING",
          toStatus: "REMOVED",
          notes: null,
        },
        {
          reportId: "r2",
          resolvedById: "admin-1",
          action: "CONTENT_REMOVED",
          fromStatus: "PENDING",
          toStatus: "REMOVED",
          notes: null,
        },
      ],
    });
    // Every distinct reporter whose report was closed by the takedown is told.
    expect(prismaMock.notification.createMany).toHaveBeenCalledWith({
      data: [
        {
          userId: "u1",
          actorId: "admin-1",
          kind: "REPORT_RESOLVED",
          message: "removed the content you reported.",
        },
        {
          userId: "u2",
          actorId: "admin-1",
          kind: "REPORT_RESOLVED",
          message: "removed the content you reported.",
        },
      ],
    });
    expect(prismaMock.comment.deleteMany).not.toHaveBeenCalled();
    expect(prismaMock.product.updateMany).not.toHaveBeenCalled();
    // Every affected reporter gets an instant push (rows committed first).
    await expectRelayed([
      {
        userId: "u1",
        actorId: "admin-1",
        kind: "REPORT_RESOLVED",
        message: "removed the content you reported.",
      },
      {
        userId: "u2",
        actorId: "admin-1",
        kind: "REPORT_RESOLVED",
        message: "removed the content you reported.",
      },
    ]);
  });

  it("removes content of a reported comment", async () => {
    prismaMock.report.findUnique.mockResolvedValue({
      ...PENDING_REPORT,
      targetType: "COMMENT",
      targetId: "c9",
    });
    prismaMock.report.findMany.mockResolvedValue([{ id: "r1", reporterId: "u1" }]);
    prismaMock.comment.deleteMany.mockResolvedValue({ count: 1 });
    prismaMock.report.updateMany.mockResolvedValue({ count: 1 });
    prismaMock.reportResolutionLog.createMany.mockResolvedValue({ count: 1 });

    const res = await resolveReport(resolveReq({ action: "CONTENT_REMOVED" }), params);

    expect(res.status).toBe(200);
    expect(prismaMock.comment.deleteMany).toHaveBeenCalledWith({ where: { id: "c9" } });
    expect(prismaMock.notification.createMany).toHaveBeenCalledWith({
      data: [
        {
          userId: "u1",
          actorId: "admin-1",
          kind: "REPORT_RESOLVED",
          message: "removed the content you reported.",
        },
      ],
    });
    expect(prismaMock.post.deleteMany).not.toHaveBeenCalled();
  });

  it("removes content of a reported product by disabling it", async () => {
    prismaMock.report.findUnique.mockResolvedValue({
      ...PENDING_REPORT,
      targetType: "PRODUCT",
      targetId: "prod-1",
    });
    prismaMock.report.findMany.mockResolvedValue([{ id: "r1", reporterId: "u1" }]);
    prismaMock.product.updateMany.mockResolvedValue({ count: 1 });
    prismaMock.report.updateMany.mockResolvedValue({ count: 1 });
    prismaMock.reportResolutionLog.createMany.mockResolvedValue({ count: 1 });

    const res = await resolveReport(resolveReq({ action: "CONTENT_REMOVED" }), params);

    expect(res.status).toBe(200);
    expect(prismaMock.product.updateMany).toHaveBeenCalledWith({
      where: { id: "prod-1" },
      data: { status: "DISABLED" },
    });
    expect(prismaMock.notification.createMany).toHaveBeenCalled();
    expect(prismaMock.post.deleteMany).not.toHaveBeenCalled();
    expect(prismaMock.comment.deleteMany).not.toHaveBeenCalled();
  });

  it("rejects content removal for USER targets (accounts are managed elsewhere)", async () => {
    prismaMock.report.findUnique.mockResolvedValue({
      ...PENDING_REPORT,
      targetType: "USER",
      targetId: "u9",
    });

    const res = await resolveReport(resolveReq({ action: "CONTENT_REMOVED" }), params);

    expect(res.status).toBe(400);
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });
});

describe("GET /api/admin/reports/[id]/history", () => {
  it("forbids non-admins", async () => {
    requireAdminMock.mockResolvedValue(forbidden());
    const res = await reportHistory(req("/api/admin/reports/r1/history"), params);
    expect(res.status).toBe(403);
  });

  it("returns 404 for an unknown report", async () => {
    prismaMock.report.findUnique.mockResolvedValue(null);
    const res = await reportHistory(req("/api/admin/reports/r1/history"), params);
    expect(res.status).toBe(404);
    expect(prismaMock.reportResolutionLog.findMany).not.toHaveBeenCalled();
  });

  it("returns the report's resolution audit trail newest first", async () => {
    prismaMock.report.findUnique.mockResolvedValue({ id: "r1" });
    const entries = [
      {
        id: "log-2",
        action: "APPROVED",
        fromStatus: "PENDING",
        toStatus: "REVIEWED",
        notes: null,
        createdAt: "2026-09-03T10:00:00.000Z",
        resolvedBy: { id: "admin-1", name: "Kim", email: "kim@x.io", image: null },
      },
    ];
    prismaMock.reportResolutionLog.findMany.mockResolvedValue(entries);

    const res = await reportHistory(req("/api/admin/reports/r1/history"), params);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual(entries);
    expect(prismaMock.reportResolutionLog.findMany).toHaveBeenCalledWith({
      where: { reportId: "r1" },
      orderBy: { createdAt: "desc" },
      take: 100,
      select: expect.objectContaining({ resolvedBy: expect.anything() }),
    });
  });
});

describe("GET /api/admin/reports/activity", () => {
  it("forbids non-admins", async () => {
    requireAdminMock.mockResolvedValue(forbidden());
    const res = await reportActivity(req("/api/admin/reports/activity"));
    expect(res.status).toBe(403);
  });

  it("returns the latest resolutions with actor and report context", async () => {
    const entries = [
      {
        id: "log-3",
        action: "CONTENT_REMOVED",
        notes: null,
        createdAt: "2026-09-03T12:00:00.000Z",
        resolvedBy: { id: "admin-1", name: "Kim", email: "kim@x.io", image: null },
        report: {
          id: "r1",
          targetType: "POST",
          targetId: "p1",
          reason: "SPAM",
          status: "REMOVED",
          reporter: { id: "u1", name: "Sok", email: "sok@x.io" },
        },
      },
    ];
    prismaMock.reportResolutionLog.findMany.mockResolvedValue(entries);

    const res = await reportActivity(req("/api/admin/reports/activity"));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual(entries);
    const call = prismaMock.reportResolutionLog.findMany.mock.calls[0][0];
    expect(call.orderBy).toEqual({ createdAt: "desc" });
    expect(call.take).toBe(10);
    // Feed rows carry the acting admin and a report summary (target + reporter).
    expect(call.select.resolvedBy).toBeDefined();
    expect(call.select.report.select.reporter).toBeDefined();
    expect(call.select.report.select.targetId).toBeDefined();
  });

  it("clamps the feed to the page maximum", async () => {
    prismaMock.reportResolutionLog.findMany.mockResolvedValue([]);

    await reportActivity(req("/api/admin/reports/activity?limit=9999"));

    expect(prismaMock.reportResolutionLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 50 }),
    );
  });
});
