import { describe, it, expect, vi, beforeEach } from "vitest";

const h = vi.hoisted(() => {
  return {
    auth: vi.fn(),
    redirect: vi.fn((url: string) => {
      // `redirect` in next/navigation never returns (it throws NEXT_REDIRECT);
      // mirror that so the guard's control flow stops where it would in prod.
      throw new Error("REDIRECT:" + url);
    }),
    findUnique: vi.fn(),
  };
});

vi.mock("@clerk/nextjs/server", () => ({ auth: h.auth }));
vi.mock("next/navigation", () => ({ redirect: h.redirect }));
vi.mock("@theo/database", () => ({
  prisma: { user: { findUnique: h.findUnique } },
}));

import { requireAdminPage } from "./require-admin-page";

describe("requireAdminPage", () => {
  beforeEach(() => {
    h.auth.mockReset();
    h.redirect.mockClear();
    h.findUnique.mockReset();
  });

  it("redirects to /sign-in when there is no Clerk session", async () => {
    h.auth.mockResolvedValue({ userId: null });
    await expect(requireAdminPage()).rejects.toThrow("REDIRECT:/sign-in");
    expect(h.findUnique).not.toHaveBeenCalled();
  });

  it("redirects to /forbidden when the local user is missing", async () => {
    h.auth.mockResolvedValue({ userId: "user_123" });
    h.findUnique.mockResolvedValue(null);
    await expect(requireAdminPage()).rejects.toThrow("REDIRECT:/forbidden");
    expect(h.findUnique).toHaveBeenCalledWith({
      where: { clerkId: "user_123" },
      select: { id: true, role: true },
    });
  });

  it("redirects to /forbidden for a non-admin role", async () => {
    h.auth.mockResolvedValue({ userId: "user_123" });
    h.findUnique.mockResolvedValue({ id: "u1", role: "CUSTOMER" });
    await expect(requireAdminPage()).rejects.toThrow("REDIRECT:/forbidden");
  });

  it("allows ADMIN and CONTENT_EDITOR by default", async () => {
    h.auth.mockResolvedValue({ userId: "user_123" });
    h.findUnique.mockResolvedValue({ id: "u1", role: "ADMIN" });
    await expect(requireAdminPage()).resolves.toEqual({ id: "u1", role: "ADMIN" });

    h.findUnique.mockResolvedValue({ id: "u2", role: "CONTENT_EDITOR" });
    await expect(requireAdminPage()).resolves.toEqual({ id: "u2", role: "CONTENT_EDITOR" });
  });

  it("respects a custom allowedRoles argument", async () => {
    h.auth.mockResolvedValue({ userId: "user_123" });
    h.findUnique.mockResolvedValue({ id: "u1", role: "CONTENT_EDITOR" });
    await expect(requireAdminPage(["ADMIN"])).rejects.toThrow(
      "REDIRECT:/forbidden"
    );
    await expect(requireAdminPage(["ADMIN", "CONTENT_EDITOR"])).resolves.toEqual({
      id: "u1",
      role: "CONTENT_EDITOR",
    });
  });
});