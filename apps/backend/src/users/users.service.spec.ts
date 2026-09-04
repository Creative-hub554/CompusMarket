import { beforeEach, describe, expect, it, vi } from "vitest";
import { Test, TestingModule } from "@nestjs/testing";
import { NotFoundException } from "@nestjs/common";
import { Role } from "@theo/database";
import { UsersService } from "./users.service";
import { PrismaService } from "../prisma/prisma.service";
import { pushRoleToClerk } from "./clerk-sync";
import { notifyRoleChange } from "./role-change-notify";

vi.mock("./clerk-sync", () => ({
  pushRoleToClerk: vi.fn(),
}));
vi.mock("./role-change-notify", () => ({
  notifyRoleChange: vi.fn(),
}));

const mockPush = vi.mocked(pushRoleToClerk);
const mockNotify = vi.mocked(notifyRoleChange);

const ACTOR = "admin-1";

function makeTarget(
  over: Partial<Record<"id" | "email" | "name" | "role" | "clerkId", string | null>> = {}
) {
  return { id: "u-1", email: "a@b.c", name: "A B", role: "CUSTOMER", clerkId: "clerk-1", ...over };
}

describe("UsersService", () => {
  let service: UsersService;

  const mockPrisma = {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
    },
    roleChangeLog: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
    $transaction: vi.fn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [UsersService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();
    service = module.get<UsersService>(UsersService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("list", () => {
    function mockTxn() {
      // Resolve the [findMany, count] array like Prisma's $transaction does.
      mockPrisma.$transaction.mockImplementation((queries: Promise<unknown>[]) =>
        Promise.all(queries)
      );
    }

    it("returns a bounded, newest-first page with the matching total", async () => {
      const items = [{ id: "u-2", email: "b@x.io", role: "CUSTOMER" }];
      mockTxn();
      mockPrisma.user.findMany.mockResolvedValue(items);
      mockPrisma.user.count.mockResolvedValue(41);

      const result = await service.list({ q: undefined, page: 2, limit: 20 });

      expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 20,
          take: 20,
          orderBy: { createdAt: "desc" },
        }),
      );
      expect(result).toEqual({ items, total: 41, page: 2, limit: 20 });
    });

    it("searches email, name, and username case-insensitively", async () => {
      mockTxn();
      mockPrisma.user.findMany.mockResolvedValue([]);
      mockPrisma.user.count.mockResolvedValue(0);

      await service.list({ q: "  kim  ", page: 1, limit: 20 });

      expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            OR: [
              { email: { contains: "kim", mode: "insensitive" } },
              { name: { contains: "kim", mode: "insensitive" } },
              { username: { contains: "kim", mode: "insensitive" } },
            ],
          },
        }),
      );
    });

    it("falls back to defaults for garbage pagination input", async () => {
      mockTxn();
      mockPrisma.user.findMany.mockResolvedValue([]);
      mockPrisma.user.count.mockResolvedValue(0);

      const result = await service.list({ q: undefined, page: Number.NaN, limit: -5 });

      expect(result).toEqual({ items: [], total: 0, page: 1, limit: 20 });
    });

    it("clamps an oversized limit to the page maximum", async () => {
      mockTxn();
      mockPrisma.user.findMany.mockResolvedValue([]);
      mockPrisma.user.count.mockResolvedValue(0);

      const result = await service.list({ q: undefined, page: 1, limit: 9999 });

      expect(result.limit).toBe(50);
    });
  });

  describe("setRole", () => {
    function mockTxnWith(updated: unknown) {
      mockPrisma.$transaction.mockImplementation((queries: Promise<unknown>[]) =>
        Promise.all(queries)
      );
      mockPrisma.user.update.mockResolvedValue(updated);
      mockPrisma.roleChangeLog.create.mockResolvedValue({ id: "log-1" });
    }

    it("promotes a user to ADMIN, logs the change, and mirrors the role to Clerk", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(makeTarget());
      mockTxnWith({ id: "u-1", email: "a@b.c", role: "ADMIN", banReason: null });

      const result = await service.setRole("u-1", Role.ADMIN, ACTOR, undefined, "admin@x.io");

      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: "u-1" },
        data: { role: "ADMIN", banReason: null },
        select: { id: true, email: true, role: true, banReason: true },
      });
      expect(mockPrisma.roleChangeLog.create).toHaveBeenCalledWith({
        data: {
          targetId: "u-1",
          changedById: ACTOR,
          fromRole: "CUSTOMER",
          toRole: "ADMIN",
          reason: null,
        },
        select: { id: true },
      });
      expect(mockPrisma.$transaction).toHaveBeenCalledWith([
        expect.anything(),
        expect.anything(),
      ]);
      expect(mockPush).toHaveBeenCalledWith("clerk-1", "ADMIN");
      expect(mockNotify).toHaveBeenCalledWith({
        actorId: ACTOR,
        actorEmail: "admin@x.io",
        targetName: "A B",
        targetEmail: "a@b.c",
        fromRole: "CUSTOMER",
        toRole: "ADMIN",
        reason: null,
      });
      expect(result.role).toBe("ADMIN");
    });

    it("demotes a user and mirrors the demotion", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(makeTarget({ role: "ADMIN" }));
      mockTxnWith({ id: "u-1", email: "a@b.c", role: "CUSTOMER", banReason: null });

      await service.setRole("u-1", Role.CUSTOMER, ACTOR);

      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { role: "CUSTOMER", banReason: null } }),
      );
      expect(mockPrisma.roleChangeLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ fromRole: "ADMIN", toRole: "CUSTOMER" }),
        }),
      );
      expect(mockPush).toHaveBeenCalledWith("clerk-1", "CUSTOMER");
    });

    it("bans a user with a reason, persisting it and recording it in the log", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(makeTarget());
      mockTxnWith({ id: "u-1", email: "a@b.c", role: "BANNED", banReason: "Fraudulent listings" });

      await service.setRole("u-1", Role.BANNED, ACTOR, "  Fraudulent listings  ");

      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { role: "BANNED", banReason: "Fraudulent listings" },
        }),
      );
      expect(mockPrisma.roleChangeLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            fromRole: "CUSTOMER",
            toRole: "BANNED",
            reason: "Fraudulent listings",
          }),
        }),
      );
      expect(mockPush).toHaveBeenCalledWith("clerk-1", "BANNED");
    });

    it("unbans a user and clears the stored ban reason", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(
        makeTarget({ role: "BANNED", clerkId: null }),
      );
      mockTxnWith({ id: "u-1", email: "a@b.c", role: "SELLER", banReason: null });

      await service.setRole("u-1", Role.SELLER, ACTOR);

      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { role: "SELLER", banReason: null } }),
      );
      // Local-only user: role logged but nothing mirrored to Clerk.
      expect(mockPrisma.roleChangeLog.create).toHaveBeenCalled();
      expect(mockPush).not.toHaveBeenCalled();
    });

    it("treats resubmitting the current role as a no-op with no writes or log", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(makeTarget({ role: "ADMIN" }));

      const result = await service.setRole("u-1", Role.ADMIN, ACTOR, "retry");

      expect(result).toEqual({ id: "u-1", email: "a@b.c", role: "ADMIN" });
      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
      expect(mockPrisma.user.update).not.toHaveBeenCalled();
      expect(mockPrisma.roleChangeLog.create).not.toHaveBeenCalled();
      expect(mockPush).not.toHaveBeenCalled();
      expect(mockNotify).not.toHaveBeenCalled();
    });

    it("throws NotFound for an unknown user and touches neither DB write nor Clerk", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(service.setRole("nope", Role.ADMIN, ACTOR)).rejects.toThrow(
        NotFoundException,
      );
      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
      expect(mockPush).not.toHaveBeenCalled();
      expect(mockNotify).not.toHaveBeenCalled();
    });

    it("updates the DB only for users without a Clerk identity", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(makeTarget({ clerkId: null }));
      mockTxnWith({ id: "u-1", email: "a@b.c", role: "SELLER", banReason: null });

      await service.setRole("u-1", Role.SELLER, ACTOR);

      expect(mockPrisma.user.update).toHaveBeenCalled();
      expect(mockPush).not.toHaveBeenCalled();
    });

    it("still succeeds when the Clerk sync fails (DB is authoritative)", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(makeTarget());
      mockTxnWith({ id: "u-1", email: "a@b.c", role: "ADMIN", banReason: null });
      mockPush.mockRejectedValue(new Error("clerk down"));

      await expect(service.setRole("u-1", Role.ADMIN, ACTOR)).resolves.toMatchObject({
        role: "ADMIN",
      });
    });
  });

  describe("history", () => {
    it("returns the user's audit trail newest-first with actor details", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: "u-1" });
      const entries = [
        {
          id: "log-2",
          fromRole: "ADMIN",
          toRole: "BANNED",
          reason: "spam",
          createdAt: new Date("2026-09-01T10:00:00Z"),
          changedBy: { id: "admin-1", name: "Kim", email: "kim@x.io", image: null },
        },
      ];
      mockPrisma.roleChangeLog.findMany.mockResolvedValue(entries);

      const result = await service.history("u-1");

      expect(mockPrisma.roleChangeLog.findMany).toHaveBeenCalledWith({
        where: { targetId: "u-1" },
        orderBy: { createdAt: "desc" },
        take: 100,
        select: expect.anything(),
      });
      expect(result).toEqual(entries);
    });

    it("throws NotFound for an unknown user", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(service.history("nope")).rejects.toThrow(NotFoundException);
      expect(mockPrisma.roleChangeLog.findMany).not.toHaveBeenCalled();
    });
  });

  describe("notifyExternalChange", () => {
    it("alerts with the resolved target and a Clerk-dashboard label", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: "u-1", email: "a@b.c", name: "A B" });

      await service.notifyExternalChange({
        targetId: "u-1",
        fromRole: "CUSTOMER",
        toRole: "BANNED",
      });

      expect(mockNotify).toHaveBeenCalledWith({
        actorId: "system",
        actorLabel: "Clerk dashboard",
        targetName: "A B",
        targetEmail: "a@b.c",
        fromRole: "CUSTOMER",
        toRole: "BANNED",
        reason: null,
      });
    });

    it("skips the alert when the target user no longer exists", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await service.notifyExternalChange({
        targetId: "gone",
        fromRole: "CUSTOMER",
        toRole: "BANNED",
      });

      expect(mockNotify).not.toHaveBeenCalled();
    });

    it("passes the reason through when present", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: "u-1", email: "a@b.c", name: null });

      await service.notifyExternalChange({
        targetId: "u-1",
        fromRole: "SELLER",
        toRole: "BANNED",
        reason: "chargebacks",
      });

      expect(mockNotify).toHaveBeenCalledWith(
        expect.objectContaining({
          targetName: undefined,
          reason: "chargebacks",
        }),
      );
    });
  });

  describe("recentChanges", () => {
    it("returns the newest role changes across users with actor and target", async () => {
      const entries = [
        {
          id: "log-9",
          fromRole: "CUSTOMER",
          toRole: "BANNED",
          reason: "spam",
          createdAt: new Date("2026-09-02T09:00:00Z"),
          changedBy: { id: "admin-1", name: "Kim", email: "kim@x.io", image: null },
          target: { id: "u-7", name: "Sok", email: "sok@x.io", image: null },
        },
      ];
      mockPrisma.roleChangeLog.findMany.mockResolvedValue(entries);

      const result = await service.recentChanges(10);

      expect(mockPrisma.roleChangeLog.findMany).toHaveBeenCalledWith({
        orderBy: { createdAt: "desc" },
        take: 10,
        select: expect.anything(),
      });
      expect(result).toEqual(entries);
    });

    it("clamps an oversized feed limit to the maximum", async () => {
      mockPrisma.roleChangeLog.findMany.mockResolvedValue([]);

      await service.recentChanges(9999);

      expect(mockPrisma.roleChangeLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 50 }),
      );
    });

    it("falls back to the default feed size when the limit is missing or garbage", async () => {
      mockPrisma.roleChangeLog.findMany.mockResolvedValue([]);

      await service.recentChanges();
      await service.recentChanges(Number.NaN);

      expect(mockPrisma.roleChangeLog.findMany).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({ take: 10 }),
      );
      expect(mockPrisma.roleChangeLog.findMany).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({ take: 10 }),
      );
    });
  });
});
