import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest, NextResponse } from "next/server";

const requireAdminMock = vi.hoisted(() => vi.fn());
const prismaMock = vi.hoisted(() => ({
  user: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  refreshToken: {
    updateMany: vi.fn().mockResolvedValue({ count: 1 }),
  },
  notification: {
    create: vi.fn(),
  },
  $transaction: vi.fn(),
  post: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    delete: vi.fn(),
  },
  comment: {
    findUnique: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock("@/lib/require-admin", () => ({
  requireAdmin: requireAdminMock,
}));

vi.mock("@theo/database", () => ({
  prisma: prismaMock,
}));

import { GET as listUsers, PATCH as patchUser } from "@/app/api/admin/users/route";
import { PATCH as updateUser } from "@/app/api/admin/users/[id]/route";
import { GET as listPosts } from "@/app/api/admin/posts/route";
import { DELETE as deletePostById } from "@/app/api/admin/posts/[id]/route";

const adminGuard = { ok: true as const, user: { id: "admin-1", role: "ADMIN" } };

function forbidden() {
  return { ok: false as const, response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
}

function req(url: string, init?: RequestInit) {
  return new NextRequest(`http://localhost${url}`, init);
}

// Real-time relay: role/ban changes push to the backend's socket-relay endpoint.
const fetchMock = vi.fn();
const RELAY_URL = "http://localhost:4000/api/internal/notifications/deliver";

beforeEach(() => {
  vi.clearAllMocks();
  requireAdminMock.mockResolvedValue(adminGuard);
  prismaMock.notification.create.mockResolvedValue({ id: "n-1" });
  // Interactive-transaction support: the route handler calls
  // prisma.$transaction(async (tx) => …); the tx delegate is the same mock
  // object, so every call is observable on prismaMock.
  prismaMock.$transaction.mockImplementation((arg: unknown) => {
    if (typeof arg === "function") return Promise.resolve(arg(prismaMock));
    return Promise.all(arg as Promise<unknown>[]);
  });
  vi.stubEnv("INTERNAL_SERVICE_TOKEN", "test-token");
  vi.stubEnv("NEXT_PUBLIC_API_URL", "http://localhost:4000");
  fetchMock.mockResolvedValue({ ok: true, status: 204 } as unknown as Response);
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("GET /api/admin/users", () => {
  it("forbids non-admins", async () => {
    requireAdminMock.mockResolvedValue(forbidden());
    const res = await listUsers(req("/api/admin/users"));
    expect(res.status).toBe(403);
    expect(prismaMock.user.findMany).not.toHaveBeenCalled();
  });

  it("lists users with activity counts", async () => {
    const users = [{ id: "u1", email: "a@b.c", role: "CUSTOMER", _count: { orders: 1, posts: 2, articles: 0 } }];
    prismaMock.user.findMany.mockResolvedValue(users);

    const res = await listUsers(req("/api/admin/users"));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual(users);
    expect(prismaMock.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: { createdAt: "desc" }, take: 100 }),
    );
  });

  it("passes search and role filters through", async () => {
    prismaMock.user.findMany.mockResolvedValue([]);

    await listUsers(req("/api/admin/users?q=sok&role=SELLER"));

    expect(prismaMock.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          role: "SELLER",
          OR: [
            { email: { contains: "sok" } },
            { name: { contains: "sok" } },
            { username: { contains: "sok" } },
          ],
        },
      }),
    );
  });
});

describe("PATCH /api/admin/users/[id]", () => {
  const params = { params: Promise.resolve({ id: "u2" }) };

  function patchReq(body: unknown) {
    return req("/api/admin/users/u2", {
      method: "PATCH",
      body: JSON.stringify(body),
      headers: { "Content-Type": "application/json" },
    });
  }

  it("forbids non-admins", async () => {
    requireAdminMock.mockResolvedValue(forbidden());
    const res = await updateUser(patchReq({ role: "SELLER" }), params);
    expect(res.status).toBe(403);
  });

  it("rejects modifying your own account", async () => {
    const res = await updateUser(patchReq({ role: "CUSTOMER" }), {
      params: Promise.resolve({ id: "admin-1" }),
    });
    expect(res.status).toBe(400);
    expect(prismaMock.user.update).not.toHaveBeenCalled();
  });

  it("rejects modifying other admins", async () => {
    prismaMock.user.findUnique.mockResolvedValue({ id: "u2", role: "ADMIN" });
    const res = await updateUser(patchReq({ role: "BANNED" }), params);
    expect(res.status).toBe(400);
    expect(prismaMock.user.update).not.toHaveBeenCalled();
  });

  it("returns 404 for unknown users", async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);
    const res = await updateUser(patchReq({ role: "SELLER" }), params);
    expect(res.status).toBe(404);
  });

  it("rejects invalid roles", async () => {
    prismaMock.user.findUnique.mockResolvedValue({ id: "u2", role: "CUSTOMER" });
    const res = await updateUser(patchReq({ role: "SUPERGOD" }), params);
    expect(res.status).toBe(400);
  });

  it("updates the role", async () => {
    prismaMock.user.findUnique.mockResolvedValue({ id: "u2", role: "CUSTOMER" });
    prismaMock.user.update.mockResolvedValue({ id: "u2", email: "u2@x.y", role: "SELLER" });

    const res = await updateUser(patchReq({ role: "SELLER" }), params);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.role).toBe("SELLER");
    expect(prismaMock.user.update).toHaveBeenCalledWith({
      where: { id: "u2" },
      data: { role: "SELLER" },
      select: { id: true, email: true, role: true },
    });
    expect(prismaMock.refreshToken.updateMany).not.toHaveBeenCalled();
  });

  it("revokes refresh tokens when banning", async () => {
    prismaMock.user.findUnique.mockResolvedValue({ id: "u2", role: "CUSTOMER" });
    prismaMock.user.update.mockResolvedValue({ id: "u2", email: "u2@x.y", role: "BANNED" });

    const res = await updateUser(patchReq({ role: "BANNED" }), params);

    expect(res.status).toBe(200);
    expect(prismaMock.refreshToken.updateMany).toHaveBeenCalledWith({
      where: { userId: "u2", revokedAt: null },
      data: { revokedAt: expect.any(Date) },
    });
  });

  it("notifies the user when banning, and relays it for instant delivery", async () => {
    prismaMock.user.findUnique.mockResolvedValue({ id: "u2", role: "CUSTOMER" });
    prismaMock.user.update.mockResolvedValue({ id: "u2", email: "u2@x.y", role: "BANNED" });

    const res = await updateUser(patchReq({ role: "BANNED" }), params);

    expect(res.status).toBe(200);
    expect(prismaMock.notification.create).toHaveBeenCalledWith({
      data: {
        userId: "u2",
        actorId: "admin-1",
        kind: "ACCOUNT_BANNED",
        message: "banned your account.",
      },
    });
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(RELAY_URL);
    expect(JSON.parse(String((init as RequestInit).body))).toEqual({
      userId: "u2",
      actorId: "admin-1",
      kind: "ACCOUNT_BANNED",
      message: "banned your account.",
    });
  });

  it("notifies the user when their role changes to something else", async () => {
    prismaMock.user.findUnique.mockResolvedValue({ id: "u2", role: "CUSTOMER" });
    prismaMock.user.update.mockResolvedValue({ id: "u2", email: "u2@x.y", role: "SELLER" });

    const res = await updateUser(patchReq({ role: "SELLER" }), params);

    expect(res.status).toBe(200);
    expect(prismaMock.notification.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: "u2",
        kind: "ROLE_CHANGED",
        message: "set your role to Seller.",
      }),
    });
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
  });

  it("frames an unban as a restore, not a generic role change", async () => {
    prismaMock.user.findUnique.mockResolvedValue({ id: "u2", role: "BANNED" });
    prismaMock.user.update.mockResolvedValue({ id: "u2", email: "u2@x.y", role: "CUSTOMER" });

    const res = await updateUser(patchReq({ role: "CUSTOMER" }), params);

    expect(res.status).toBe(200);
    expect(prismaMock.notification.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        kind: "ROLE_CHANGED",
        message: "restored your account.",
      }),
    });
  });

  it("does not notify when the role is resubmitted unchanged", async () => {
    prismaMock.user.findUnique.mockResolvedValue({ id: "u2", role: "CUSTOMER" });
    prismaMock.user.update.mockResolvedValue({ id: "u2", email: "u2@x.y", role: "CUSTOMER" });

    const res = await updateUser(patchReq({ role: "CUSTOMER" }), params);

    expect(res.status).toBe(200);
    expect(prismaMock.notification.create).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("GET /api/admin/posts", () => {
  it("forbids non-admins", async () => {
    requireAdminMock.mockResolvedValue(forbidden());
    const res = await listPosts(req("/api/admin/posts"));
    expect(res.status).toBe(403);
  });

  it("lists posts newest first with author and counts", async () => {
    const posts = [
      { id: "p1", content: "hello", author: { id: "u1" }, media: [], _count: { comments: 2, reactions: 5 } },
    ];
    prismaMock.post.findMany.mockResolvedValue(posts);

    const res = await listPosts(req("/api/admin/posts"));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.posts).toEqual(posts);
    expect(body.nextCursor).toBeNull();
    expect(prismaMock.post.findMany).toHaveBeenCalledWith(expect.objectContaining({ orderBy: { createdAt: "desc" } }));
  });
});

describe("DELETE /api/admin/posts/[id]", () => {
  const params = { params: Promise.resolve({ id: "p1" }) };

  it("forbids non-admins", async () => {
    requireAdminMock.mockResolvedValue(forbidden());
    const res = await deletePostById(req("/api/admin/posts/p1", { method: "DELETE" }), params);
    expect(res.status).toBe(403);
  });

  it("returns 404 for unknown posts", async () => {
    prismaMock.post.findUnique.mockResolvedValue(null);
    const res = await deletePostById(req("/api/admin/posts/p1", { method: "DELETE" }), params);
    expect(res.status).toBe(404);
  });

  it("deletes the post", async () => {
    prismaMock.post.findUnique.mockResolvedValue({ id: "p1" });
    prismaMock.post.delete.mockResolvedValue({ id: "p1" });

    const res = await deletePostById(req("/api/admin/posts/p1", { method: "DELETE" }), params);

    expect(res.status).toBe(200);
    expect(prismaMock.post.delete).toHaveBeenCalledWith({ where: { id: "p1" } });
  });
});
