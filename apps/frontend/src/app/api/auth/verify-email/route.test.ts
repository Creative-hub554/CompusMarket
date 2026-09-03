import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@theo/database", () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    emailVerificationToken: {
      findUnique: vi.fn(),
      deleteMany: vi.fn(),
      update: vi.fn(),
      create: vi.fn(),
    },
    $transaction: vi.fn((ops: unknown[]) => Promise.resolve(ops)),
  },
}));

vi.mock("@/lib/rateLimit", () => ({
  rateLimit: vi.fn(() => true),
}));

vi.mock("@/lib/authTokens", () => ({
  randomToken: vi.fn(() => "verify-token-123"),
  sha256: vi.fn((v: string) => `sha256(${v})`),
}));

vi.mock("@/lib/mail", () => ({
  sendMail: vi.fn(async () => ({ delivered: false, reason: "no-config" })),
}));

vi.mock("@/lib/site", () => ({
  SITE_NAME: "Champey",
  getSiteUrl: () => "http://localhost:3000",
}));

import { NextRequest } from "next/server";
import { prisma } from "@theo/database";
import { rateLimit } from "@/lib/rateLimit";
import { sendMail } from "@/lib/mail";
import { POST } from "./route";

const mockPrisma = prisma as unknown as {
  user: { findUnique: ReturnType<typeof vi.fn> };
  emailVerificationToken: {
    deleteMany: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
  };
};

function jsonPost(body: unknown, headers: Record<string, string> = {}) {
  return new NextRequest("http://localhost/api/auth/verify-email", {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(rateLimit).mockReturnValue(true);
  vi.mocked(sendMail).mockResolvedValue({ delivered: false, reason: "no-config" });
});

describe("POST /api/auth/verify-email (session-free resend)", () => {
  it("rejects with 400 when email is missing or empty", async () => {
    const res = await POST(jsonPost({}));
    expect(res.status).toBe(400);
    const res2 = await POST(jsonPost({ email: "   " }));
    expect(res2.status).toBe(400);
    expect(mockPrisma.user.findUnique).not.toHaveBeenCalled();
  });

  it("returns 429 when rate-limited", async () => {
    vi.mocked(rateLimit).mockReturnValue(false);
    const res = await POST(jsonPost({ email: "a@b.com" }));
    expect(res.status).toBe(429);
    expect(mockPrisma.user.findUnique).not.toHaveBeenCalled();
  });

  it("does not enumerate accounts: unknown email still returns ok:true and sends nothing", async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);

    const res = await POST(jsonPost({ email: "ghost@example.com" }));
    const json = await res.json();

    expect(json).toEqual({ ok: true });
    expect(mockPrisma.emailVerificationToken.create).not.toHaveBeenCalled();
    expect(sendMail).not.toHaveBeenCalled();
  });

  it("does not re-send for an already-verified account", async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ id: "u-1", email: "a@b.com", emailVerified: new Date() });

    const res = await POST(jsonPost({ email: "  A@B.com  " }));
    const json = await res.json();

    expect(json.ok).toBe(true);
    expect(mockPrisma.emailVerificationToken.create).not.toHaveBeenCalled();
    expect(sendMail).not.toHaveBeenCalled();
  });

  it("normalizes the email, rotates the token, and emails a verification link for an unverified account", async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: "u-1",
      email: "user@example.com",
      emailVerified: null,
    });
    mockPrisma.emailVerificationToken.deleteMany.mockResolvedValue({ count: 1 });
    mockPrisma.emailVerificationToken.create.mockResolvedValue({ id: "t-1" });

    const res = await POST(jsonPost({ email: "  User@Example.COM  ", locale: "en" }));
    const json = await res.json();

    expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
      where: { email: "user@example.com" },
    });
    expect(mockPrisma.emailVerificationToken.deleteMany).toHaveBeenCalledWith({
      where: { userId: "u-1", usedAt: null },
    });
    expect(mockPrisma.emailVerificationToken.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        tokenHash: "sha256(verify-token-123)",
        userId: "u-1",
      }),
    });
    expect(sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "user@example.com",
        // devUrl exposes the link because mail is not configured.
        text: expect.stringContaining("http://localhost:3000/en/verify-email?token=verify-token-123"),
      }),
    );
    expect(json).toEqual(
      expect.objectContaining({
        ok: true,
        devUrl: expect.stringContaining("verify-token-123"),
      }),
    );
  });

  it("returns 500 when token creation fails", async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: "u-1",
      email: "user@example.com",
      emailVerified: null,
    });
    mockPrisma.emailVerificationToken.create.mockRejectedValue(new Error("boom"));

    const res = await POST(jsonPost({ email: "user@example.com" }));
    expect(res.status).toBe(500);
  });
});
