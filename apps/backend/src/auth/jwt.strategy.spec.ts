import { Test, TestingModule } from "@nestjs/testing";
import { UnauthorizedException } from "@nestjs/common";
import { JwtStrategy } from "./jwt.strategy";
import { PrismaService } from "../prisma/prisma.service";

// The JwtStrategy constructor resolves the signing secret at module build
// time, so provide a dummy before the testing module compiles.
process.env.AUTH_SECRET = "test-auth-secret";

describe("JwtStrategy", () => {
  let strategy: JwtStrategy;

  const mockPrisma = {
    user: {
      findUnique: vi.fn(),
    },
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [JwtStrategy, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();
    strategy = module.get<JwtStrategy>(JwtStrategy);
  });

  it("should be defined", () => {
    expect(strategy).toBeDefined();
  });

  describe("validate", () => {
    it("returns the identity resolved from the DB, not the token claims", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: "user-1",
        email: "user@test.com",
        role: "CUSTOMER",
      });

      const result = await strategy.validate({ sub: "user-1" });

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: "user-1" },
        select: { id: true, email: true, role: true },
      });
      expect(result).toEqual({ userId: "user-1", email: "user@test.com", role: "CUSTOMER" });
    });

    it("reflects a role demotion immediately despite a stale token claim", async () => {
      // Token was minted while the user was ADMIN, but the DB now says
      // CUSTOMER — the strategy must surface the live role.
      mockPrisma.user.findUnique.mockResolvedValue({
        id: "user-1",
        email: "user@test.com",
        role: "CUSTOMER",
      });

      const result = await strategy.validate({ sub: "user-1" });

      expect(result.role).toBe("CUSTOMER");
    });

    it("rejects a banned user even while their access token is still valid", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: "user-1",
        email: "banned@test.com",
        role: "BANNED",
      });

      await expect(strategy.validate({ sub: "user-1" })).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it("rejects an unknown (deleted) subject", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(strategy.validate({ sub: "ghost-user" })).rejects.toBeInstanceOf(UnauthorizedException);
    });
  });
});
