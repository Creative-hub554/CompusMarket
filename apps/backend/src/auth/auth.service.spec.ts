import { Test, TestingModule } from "@nestjs/testing";
import { JwtService } from "@nestjs/jwt";
import { UnauthorizedException } from "@nestjs/common";
import { AuthService } from "./auth.service";
import { PrismaService } from "../prisma/prisma.service";

vi.mock("bcryptjs", () => ({
  compare: vi.fn(),
  hash: vi.fn(),
}));

import * as bcrypt from "bcryptjs";

describe("AuthService", () => {
  let service: AuthService;

  const mockUser = {
    id: "user-1",
    email: "test@test.com",
    name: "Test",
    role: "CUSTOMER",
    passwordHash: "hashed-password",
  };

  const mockPrisma = {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    refreshToken: {
      create: vi.fn().mockResolvedValue({}),
      findUnique: vi.fn(),
      updateMany: vi.fn(),
      deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
    },
  };

  const mockJwt = {
    sign: vi.fn().mockReturnValue("test-token"),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: JwtService, useValue: mockJwt },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("login", () => {
    it("throws when the user does not exist", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      await expect(service.login("nobody@test.com", "password")).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it("throws when the user has no password hash", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ ...mockUser, passwordHash: null });
      await expect(service.login(mockUser.email, "password")).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it("throws when the password is invalid", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      (bcrypt.compare as ReturnType<typeof vi.fn>).mockResolvedValue(false);
      await expect(service.login(mockUser.email, "wrong-password")).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });

    it("throws when the user is banned, even with valid credentials", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ ...mockUser, role: "BANNED" });
      (bcrypt.compare as ReturnType<typeof vi.fn>).mockResolvedValue(true);
      await expect(service.login(mockUser.email, "password")).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
      expect(mockPrisma.refreshToken.create).not.toHaveBeenCalled();
    });

    it("returns a token and user on valid credentials", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      (bcrypt.compare as ReturnType<typeof vi.fn>).mockResolvedValue(true);

      const result = await service.login(mockUser.email, "password");

      expect(bcrypt.compare).toHaveBeenCalledWith("password", mockUser.passwordHash);
      expect(mockJwt.sign).toHaveBeenCalledWith({
        sub: mockUser.id,
        email: mockUser.email,
        role: mockUser.role,
      });
      expect(mockPrisma.refreshToken.create).toHaveBeenCalledTimes(1);
      expect(result.access_token).toBe("test-token");
      expect(typeof result.refresh_token).toBe("string");
      expect(result.refresh_token.length).toBeGreaterThan(32);
      expect(result.user).toEqual({ id: mockUser.id, email: mockUser.email, name: mockUser.name, role: mockUser.role });
    });
  });

  describe("register", () => {
    it("throws when the email is already taken", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      await expect(service.register(mockUser.email, "password")).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
      expect(mockPrisma.user.create).not.toHaveBeenCalled();
    });

    it("hashes the password, creates the user, and returns a token", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      (bcrypt.hash as ReturnType<typeof vi.fn>).mockResolvedValue("bcrypt-hash");
      mockPrisma.user.create.mockResolvedValue(mockUser);

      const result = await service.register("new@test.com", "password", "New User");

      expect(bcrypt.hash).toHaveBeenCalledWith("password", 12);
      expect(mockPrisma.user.create).toHaveBeenCalledWith({
        data: { email: "new@test.com", passwordHash: "bcrypt-hash", name: "New User" },
      });
      expect(mockJwt.sign).toHaveBeenCalledWith({
        sub: mockUser.id,
        email: mockUser.email,
        role: mockUser.role,
      });
      expect(result.access_token).toBe("test-token");
      expect(typeof result.refresh_token).toBe("string");
    });
  });

  describe("refresh", () => {
    it("throws on an unknown refresh token", async () => {
      mockPrisma.refreshToken.findUnique.mockResolvedValue(null);
      await expect(service.refresh("no-such-token-value-aaaaaaaaaaaa")).rejects.toBeInstanceOf(
        UnauthorizedException
      );
    });

    it("throws when the stored token is revoked and revokes all user tokens", async () => {
      mockPrisma.refreshToken.findUnique.mockResolvedValue({
        id: "rt-1",
        userId: mockUser.id,
        revokedAt: new Date(),
        expiresAt: new Date(Date.now() + 10000),
        user: mockUser,
      });
      mockPrisma.refreshToken.updateMany.mockResolvedValue({ count: 2 });
      await expect(service.refresh("some-revoked-token-aaaaaaaaaa")).rejects.toBeInstanceOf(
        UnauthorizedException
      );
      expect(mockPrisma.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { userId: mockUser.id, revokedAt: null },
        data: { revokedAt: expect.any(Date) },
      });
    });

    it("throws when the stored token is expired", async () => {
      mockPrisma.refreshToken.findUnique.mockResolvedValue({
        id: "rt-1",
        revokedAt: null,
        expiresAt: new Date(Date.now() - 10000),
        user: mockUser,
      });
      await expect(service.refresh("some-expired-token-aaaaaaaaaa")).rejects.toBeInstanceOf(
        UnauthorizedException
      );
    });

    it("throws and revokes the token family when the user is banned", async () => {
      mockPrisma.refreshToken.findUnique.mockResolvedValue({
        id: "rt-1",
        userId: mockUser.id,
        revokedAt: null,
        expiresAt: new Date(Date.now() + 10000),
        user: { ...mockUser, role: "BANNED" },
      });
      mockPrisma.refreshToken.updateMany.mockResolvedValue({ count: 3 });

      await expect(service.refresh("a-banned-users-token-aaaaaaaa")).rejects.toBeInstanceOf(
        UnauthorizedException
      );
      expect(mockPrisma.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { userId: mockUser.id, revokedAt: null },
        data: { revokedAt: expect.any(Date) },
      });
    });

    it("rotates the token and returns a new pair", async () => {
      const future = new Date(Date.now() + 10000);
      mockPrisma.refreshToken.findUnique.mockResolvedValue({
        id: "rt-1",
        revokedAt: null,
        expiresAt: future,
        user: mockUser,
      });
      mockPrisma.refreshToken.updateMany.mockResolvedValue({ count: 1 });

      const result = await service.refresh("a-valid-refresh-token-value");

      expect(mockPrisma.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { id: "rt-1", revokedAt: null },
        data: { revokedAt: expect.any(Date) },
      });
      expect(result.access_token).toBe("test-token");
      expect(typeof result.refresh_token).toBe("string");
    });

    it("rejects when another request rotated the token first", async () => {
      const future = new Date(Date.now() + 10000);
      mockPrisma.refreshToken.findUnique.mockResolvedValue({
        id: "rt-1",
        revokedAt: null,
        expiresAt: future,
        user: mockUser,
      });
      mockPrisma.refreshToken.updateMany.mockResolvedValue({ count: 0 });

      await expect(service.refresh("a-valid-refresh-token-value")).rejects.toBeInstanceOf(
        UnauthorizedException
      );
    });
  });

  describe("logout", () => {
    it("revokes the stored token", async () => {
      mockPrisma.refreshToken.updateMany.mockResolvedValue({ count: 1 });
      const result = await service.logout("a-valid-refresh-token-value");
      expect(mockPrisma.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { tokenHash: expect.any(String), revokedAt: null },
        data: { revokedAt: expect.any(Date) },
      });
      expect(result).toEqual({ ok: true });
    });
  });
});
