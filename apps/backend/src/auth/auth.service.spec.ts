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
      expect(result.access_token).toBe("test-token");
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
    });
  });
});
