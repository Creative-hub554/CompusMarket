import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { UnauthorizedException } from "@nestjs/common";
import { JwtOrClerkGuard } from "./jwt-or-clerk.guard";

vi.mock("jsonwebtoken", () => ({
  default: { verify: vi.fn() },
}));

vi.mock("@clerk/backend", () => ({
  verifyToken: vi.fn(),
}));

import jwt from "jsonwebtoken";
import { verifyToken } from "@clerk/backend";

interface MockRequest {
  headers: Record<string, string | undefined>;
  user?: unknown;
}

function makeContext(req: MockRequest) {
  return { switchToHttp: () => ({ getRequest: () => req }) };
}

const ADMIN = { id: "user-1", email: "admin@test.com", role: "ADMIN" };

describe("JwtOrClerkGuard", () => {
  const OLD_ENV = process.env;
  let guard: JwtOrClerkGuard;
  const mockPrisma = {
    user: { findUnique: vi.fn() },
  };

  beforeEach(() => {
    process.env = { ...OLD_ENV };
    process.env.AUTH_SECRET = "test-auth-secret";
    vi.clearAllMocks();
    guard = new JwtOrClerkGuard(mockPrisma as never);
  });

  afterEach(() => {
    process.env = OLD_ENV;
  });

  it("authenticates a legacy JWT (sub = local user id) and resolves role from the DB", async () => {
    process.env.CLERK_SECRET_KEY = "test-clerk-secret";
    vi.mocked(jwt.verify).mockReturnValue({ sub: "user-1" } as never);
    mockPrisma.user.findUnique.mockResolvedValue(ADMIN);

    const req: MockRequest = { headers: { authorization: "Bearer legacy.jwt" } };
    await expect(guard.canActivate(makeContext(req) as never)).resolves.toBe(true);

    expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
      where: { id: "user-1" },
      select: { id: true, email: true, role: true },
    });
    expect(req.user).toEqual({ userId: "user-1", email: "admin@test.com", role: "ADMIN" });
  });

  it("falls back to a Clerk session token when the token is not a legacy JWT", async () => {
    process.env.CLERK_SECRET_KEY = "test-clerk-secret";
    vi.mocked(jwt.verify).mockImplementation(() => {
      throw new Error("jwt malformed");
    });
    vi.mocked(verifyToken).mockResolvedValue({ sub: "clerk-1" } as never);
    mockPrisma.user.findUnique.mockResolvedValue({ ...ADMIN, id: "local-1" });

    const req: MockRequest = { headers: { authorization: "Bearer clerk.session.jwt" } };
    await expect(guard.canActivate(makeContext(req) as never)).resolves.toBe(true);

    expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
      where: { clerkId: "clerk-1" },
      select: { id: true, email: true, role: true },
    });
    expect(req.user).toEqual({ userId: "local-1", email: "admin@test.com", role: "ADMIN" });
  });

  it("rejects a banned user on either credential path", async () => {
    process.env.CLERK_SECRET_KEY = "test-clerk-secret";
    vi.mocked(jwt.verify).mockReturnValue({ sub: "user-1" } as never);
    mockPrisma.user.findUnique.mockResolvedValue({
      ...ADMIN,
      role: "BANNED",
    });

    const req: MockRequest = { headers: { authorization: "Bearer legacy.jwt" } };
    await expect(guard.canActivate(makeContext(req) as never)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(req.user).toBeUndefined();
  });

  it("rejects an unknown subject on both paths", async () => {
    process.env.CLERK_SECRET_KEY = "test-clerk-secret";
    vi.mocked(jwt.verify).mockImplementation(() => {
      throw new Error("jwt malformed");
    });
    vi.mocked(verifyToken).mockResolvedValue({ sub: "ghost-clerk" } as never);
    mockPrisma.user.findUnique.mockResolvedValue(null);

    const req: MockRequest = { headers: { authorization: "Bearer clerk.session.jwt" } };
    await expect(guard.canActivate(makeContext(req) as never)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it("rejects a request without an Authorization header", async () => {
    const req: MockRequest = { headers: {} };
    await expect(guard.canActivate(makeContext(req) as never)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it("rejects when no Clerk secret is configured and the token is not legacy", async () => {
    delete process.env.CLERK_SECRET_KEY;
    vi.mocked(jwt.verify).mockImplementation(() => {
      throw new Error("jwt malformed");
    });

    const req: MockRequest = { headers: { authorization: "Bearer clerk.session.jwt" } };
    await expect(guard.canActivate(makeContext(req) as never)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(verifyToken).not.toHaveBeenCalled();
  });
});