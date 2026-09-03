import { describe, it, expect, vi, beforeEach } from "vitest";

let capturedNextAuth: any;
let capturedProviderAuthorize: ((c: any, r: any) => any) | null = null;

vi.mock("next-auth", () => ({
  __esModule: true,
  default: (opts: any) => {
    capturedNextAuth = opts;
    return () => {};
  },
  // CredentialsProvider re-exports are resolved via the provider mock below.
}));

vi.mock("next-auth/providers/credentials", () => {
  const mock = {
    __esModule: true,
    default: (config: any) => {
      capturedProviderAuthorize = config.authorize;
      return {
        id: "credentials",
        name: "Credentials",
        type: "credentials",
        authorize: config.authorize,
      };
    },
  };
  return mock;
});

vi.mock("@/lib/rateLimit", () => ({
  rateLimit: vi.fn(() => true),
}));

// Authorize dynamic-imports these; resolved via the mock maps below.
vi.mock("@theo/database", () => ({
  prisma: {
    user: { findUnique: vi.fn() },
  },
}));

vi.mock("bcryptjs", () => ({
  compare: vi.fn(),
}));

import { prisma } from "@theo/database";
import { compare } from "bcryptjs";
import { rateLimit } from "@/lib/rateLimit";

const mockFindUnique = (prisma as any).user.findUnique as ReturnType<typeof vi.fn>;
const mockCompare = compare as ReturnType<typeof vi.fn>;

const unverified = {
  id: "u-1",
  email: "a@b.com",
  name: "A",
  role: "BUYER",
  passwordHash: "hash",
  emailVerified: null,
};

// The [...nextauth]/route module is evaluated once (module cache), so the
// provider's authorize callback is captured a single time here. beforeEach only
// resets the vi.fn() behavior; the captured callback stays stable across tests.
beforeEach(() => {
  vi.clearAllMocks();
});

describe("credentials login gate", () => {
  it("rejects unverified users even with a correct password (no session issued)", async () => {
    await import("@/app/api/auth/[...nextauth]/route");
    mockFindUnique.mockResolvedValue(unverified);
    mockCompare.mockResolvedValue(true);

    const result = await capturedProviderAuthorize!(
      { email: "a@b.com", password: "correct" },
      { headers: new Headers() },
    );

    expect(result).toBeNull();
    expect(mockCompare).toHaveBeenCalledWith("correct", "hash");
  });

  it("allows a verified user with a valid password", async () => {
    await import("@/app/api/auth/[...nextauth]/route");
    mockFindUnique.mockResolvedValue({ ...unverified, emailVerified: new Date() });
    mockCompare.mockResolvedValue(true);

    const result = await capturedProviderAuthorize!(
      { email: "a@b.com", password: "correct" },
      { headers: new Headers() },
    );

    expect(result).toEqual(
      expect.objectContaining({ email: "a@b.com", role: "BUYER" }),
    );
    expect(result).not.toHaveProperty("passwordHash");
  });

  it("rejects when the password does not match", async () => {
    await import("@/app/api/auth/[...nextauth]/route");
    mockFindUnique.mockResolvedValue({ ...unverified, emailVerified: new Date() });
    mockCompare.mockResolvedValue(false);

    const result = await capturedProviderAuthorize!(
      { email: "a@b.com", password: "wrong" },
      { headers: new Headers() },
    );

    expect(result).toBeNull();
  });

  it("rejects banned users", async () => {
    await import("@/app/api/auth/[...nextauth]/route");
    mockFindUnique.mockResolvedValue({
      ...unverified,
      role: "BANNED",
      emailVerified: new Date(),
    });
    mockCompare.mockResolvedValue(true);

    const result = await capturedProviderAuthorize!(
      { email: "a@b.com", password: "correct" },
      { headers: new Headers() },
    );

    expect(result).toBeNull();
  });

  it("returns null for an unknown account", async () => {
    await import("@/app/api/auth/[...nextauth]/route");
    mockFindUnique.mockResolvedValue(null);

    const result = await capturedProviderAuthorize!(
      { email: "nobody@example.com", password: "x" },
      { headers: new Headers() },
    );

    expect(result).toBeNull();
    expect(mockCompare).not.toHaveBeenCalled();
  });
});
