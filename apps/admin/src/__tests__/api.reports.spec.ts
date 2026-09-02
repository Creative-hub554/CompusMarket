import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const requireAdminMock = vi.hoisted(() => vi.fn());
const prismaMock = vi.hoisted(() => ({
  report: {
    findMany: vi.fn(),
    groupBy: vi.fn(),
  },
}));

vi.mock("@/lib/require-admin", () => ({
  requireAdmin: requireAdminMock,
}));

vi.mock("@theo/database", () => ({
  prisma: prismaMock,
}));

import { GET as listReports } from "@/app/api/admin/reports/route";

const adminGuard = { ok: true as const, user: { id: "admin-1", role: "ADMIN" } };

function forbidden() {
  return { ok: false as const, response: { status: 403 } };
}

function req(url: string) {
  return new NextRequest(`http://localhost${url}`);
}

beforeEach(() => {
  vi.clearAllMocks();
  requireAdminMock.mockResolvedValue(adminGuard);
});

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
