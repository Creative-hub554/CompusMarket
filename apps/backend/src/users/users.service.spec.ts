import { beforeEach, describe, expect, it, vi } from "vitest";
import { Test, TestingModule } from "@nestjs/testing";
import { NotFoundException } from "@nestjs/common";
import { Role } from "@theo/database";
import { UsersService } from "./users.service";
import { PrismaService } from "../prisma/prisma.service";
import { pushRoleToClerk } from "./clerk-sync";

vi.mock("./clerk-sync", () => ({
  pushRoleToClerk: vi.fn(),
}));

const mockPush = vi.mocked(pushRoleToClerk);

describe("UsersService", () => {
  let service: UsersService;

  const mockPrisma = {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
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
    it("promotes a user to ADMIN and mirrors the role to Clerk metadata", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: "u-1", clerkId: "clerk-1" });
      mockPrisma.user.update.mockResolvedValue({ id: "u-1", email: "a@b.c", role: "ADMIN" });

      const result = await service.setRole("u-1", Role.ADMIN);

      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: "u-1" }, data: { role: "ADMIN" } }),
      );
      expect(mockPush).toHaveBeenCalledWith("clerk-1", "ADMIN");
      expect(result.role).toBe("ADMIN");
    });

    it("demotes a user and mirrors the demotion", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: "u-1", clerkId: "clerk-1" });
      mockPrisma.user.update.mockResolvedValue({ id: "u-1", email: "a@b.c", role: "CUSTOMER" });

      await service.setRole("u-1", Role.CUSTOMER);

      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { role: "CUSTOMER" } }),
      );
      expect(mockPush).toHaveBeenCalledWith("clerk-1", "CUSTOMER");
    });

    it("bans a user by setting BANNED and mirrors it", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: "u-1", clerkId: "clerk-1" });
      mockPrisma.user.update.mockResolvedValue({ id: "u-1", email: "a@b.c", role: "BANNED" });

      await service.setRole("u-1", Role.BANNED);

      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { role: "BANNED" } }),
      );
      expect(mockPush).toHaveBeenCalledWith("clerk-1", "BANNED");
    });

    it("unbans a user by restoring a non-BANNED role", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: "u-1", clerkId: "clerk-1" });
      mockPrisma.user.update.mockResolvedValue({ id: "u-1", email: "a@b.c", role: "CUSTOMER" });

      await service.setRole("u-1", Role.CUSTOMER);

      expect(mockPush).toHaveBeenCalledWith("clerk-1", "CUSTOMER");
    });

    it("throws NotFound for an unknown user and touches neither DB write nor Clerk", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(service.setRole("nope", Role.ADMIN)).rejects.toThrow(NotFoundException);
      expect(mockPrisma.user.update).not.toHaveBeenCalled();
      expect(mockPush).not.toHaveBeenCalled();
    });

    it("updates the DB only for users without a Clerk identity", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: "u-1", clerkId: null });
      mockPrisma.user.update.mockResolvedValue({ id: "u-1", email: "a@b.c", role: "SELLER" });

      await service.setRole("u-1", Role.SELLER);

      expect(mockPrisma.user.update).toHaveBeenCalled();
      expect(mockPush).not.toHaveBeenCalled();
    });

    it("still succeeds when the Clerk sync fails (DB is authoritative)", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: "u-1", clerkId: "clerk-1" });
      mockPrisma.user.update.mockResolvedValue({ id: "u-1", email: "a@b.c", role: "ADMIN" });
      mockPush.mockRejectedValue(new Error("clerk down"));

      await expect(service.setRole("u-1", Role.ADMIN)).resolves.toMatchObject({
        role: "ADMIN",
      });
    });
  });
});