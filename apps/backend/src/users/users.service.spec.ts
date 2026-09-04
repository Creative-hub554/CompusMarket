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
    },
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