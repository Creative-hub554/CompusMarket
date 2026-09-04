import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { verifyWebhookMock, clerkClientMock, prismaMock } = vi.hoisted(() => ({
  verifyWebhookMock: vi.fn(),
  clerkClientMock: vi.fn(),
  prismaMock: {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      create: vi.fn(),
    },
    roleChangeLog: { create: vi.fn() },
    $transaction: vi.fn(),
  },
}));

vi.mock("@clerk/nextjs/webhooks", () => ({
  verifyWebhook: verifyWebhookMock,
}));
vi.mock("@clerk/nextjs/server", () => ({
  clerkClient: clerkClientMock,
}));
vi.mock("@theo/database", () => ({
  prisma: prismaMock,
  Role: {},
}));

// Imported after mocks are set up.
import { POST } from "./route";

const ROW = {
  id: "row_1",
  email: "user@example.com",
  role: "CUSTOMER",
  clerkId: null,
  emailVerified: null,
};

const CREATED_EVENT = {
  type: "user.created",
  data: {
    id: "user_1",
    first_name: "Kim",
    last_name: "Srey",
    image_url: "https://img.example/k.png",
    primary_email_address_id: "email_id_1",
    email_addresses: [{ id: "email_id_1", email_address: "user@example.com" }],
  },
};

function clerkRequest(evt: unknown, svixId = "msg_1") {
  return new NextRequest("http://localhost/api/webhooks/clerk", {
    method: "POST",
    headers: {
      "svix-id": svixId,
      "svix-timestamp": "1700000000",
      "svix-signature": "v1,fake",
    },
    body: JSON.stringify(evt),
  });
}

async function postEvent(evt: unknown, svixId?: string) {
  return POST(clerkRequest(evt, svixId));
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.CLERK_WEBHOOK_SECRET = "whsec_test";
  verifyWebhookMock.mockResolvedValue({
    type: "user.created",
    data: {},
  } as never);
  clerkClientMock.mockResolvedValue({
    users: { updateUserMetadata: vi.fn().mockResolvedValue({}) },
  });
  prismaMock.$transaction.mockImplementation((ops) => Promise.all(ops));
});

afterEach(() => {
  delete process.env.CLERK_WEBHOOK_SECRET;
});

describe("POST /api/webhooks/clerk", () => {
  it("returns 503 when CLERK_WEBHOOK_SECRET is unset, without verifying", async () => {
    delete process.env.CLERK_WEBHOOK_SECRET;
    const res = await POST(clerkRequest(CREATED_EVENT));
    expect(res.status).toBe(503);
    expect(verifyWebhookMock).not.toHaveBeenCalled();
  });

  it("returns 400 on a bad signature without touching prisma", async () => {
    verifyWebhookMock.mockRejectedValue(new Error("bad signature"));
    const res = await POST(clerkRequest(CREATED_EVENT));
    expect(res.status).toBe(400);
    expect(prismaMock.user.create).not.toHaveBeenCalled();
  });

  it("creates a local row for user.created", async () => {
    verifyWebhookMock.mockResolvedValue(CREATED_EVENT as never);
    prismaMock.user.findUnique.mockResolvedValue(null);
    prismaMock.user.create.mockResolvedValue(ROW);

    const res = await postEvent(CREATED_EVENT);
    expect(res.status).toBe(200);
    expect(prismaMock.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          clerkId: "user_1",
          email: "user@example.com",
          name: "Kim Srey",
          image: "https://img.example/k.png",
        }),
      }),
    );
  });

  it("skips re-handling the same svix-id delivery (dedupe remembers success)", async () => {
    verifyWebhookMock.mockResolvedValue(CREATED_EVENT as never);
    prismaMock.user.findUnique.mockResolvedValue(null);
    prismaMock.user.create.mockResolvedValue(ROW);

    const first = await postEvent(CREATED_EVENT, "msg_dup");
    expect(first.status).toBe(200);

    prismaMock.user.create.mockClear();
    const second = await postEvent(CREATED_EVENT, "msg_dup");
    expect(second.status).toBe(200);
    expect(await second.json()).toEqual({ received: true, duplicate: true });
    expect(prismaMock.user.create).not.toHaveBeenCalled();
  });

  it("re-processes the same svix-id once the 10-minute window expires", async () => {
    verifyWebhookMock.mockResolvedValue(CREATED_EVENT as never);
    prismaMock.user.findUnique.mockResolvedValue(null);
    prismaMock.user.create.mockResolvedValue(ROW);
    await postEvent(CREATED_EVENT, "msg_old");
    prismaMock.user.create.mockClear();

    vi.useFakeTimers();
    try {
      vi.setSystemTime(Date.now() + 11 * 60 * 1000);
      const res = await postEvent(CREATED_EVENT, "msg_old");
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ received: true });
      expect(prismaMock.user.create).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it("does NOT swallow retries of a failed delivery (remembered only on success)", async () => {
    verifyWebhookMock.mockResolvedValue(CREATED_EVENT as never);
    prismaMock.user.findUnique.mockResolvedValue(null);
    prismaMock.user.create.mockRejectedValueOnce(new Error("db down"));

    const failed = await postEvent(CREATED_EVENT, "msg_retry");
    expect(failed.status).toBe(500);

    prismaMock.user.create.mockResolvedValue(ROW);
    const retry = await postEvent(CREATED_EVENT, "msg_retry");
    expect(retry.status).toBe(200);
    expect(prismaMock.user.create).toHaveBeenCalledTimes(2);
  });

  it("guards user.deleted with no id (no prisma call, still 200)", async () => {
    verifyWebhookMock.mockResolvedValue({
      type: "user.deleted",
      data: { object: "user", id: null, deleted: true },
    } as never);

    const res = await postEvent(
      { type: "user.deleted", data: { deleted: true } },
      "msg_del_noid",
    );
    expect(res.status).toBe(200);
    expect(prismaMock.user.updateMany).not.toHaveBeenCalled();
  });

  it("detaches clerkId on user.deleted with an id", async () => {
    verifyWebhookMock.mockResolvedValue({
      type: "user.deleted",
      data: { object: "user", id: "user_9", deleted: true },
    } as never);
    prismaMock.user.updateMany.mockResolvedValue({ count: 1 });

    const res = await postEvent(
      { type: "user.deleted", data: { id: "user_9" } },
      "msg_del",
    );
    expect(res.status).toBe(200);
    expect(prismaMock.user.updateMany).toHaveBeenCalledWith({
      where: { clerkId: "user_9" },
      data: { clerkId: null },
    });
  });

  it("bans an existing account via updateWithBan: role flip + null-actor audit row in one tx", async () => {
    const updatedEvent = {
      type: "user.updated",
      data: {
        ...CREATED_EVENT.data,
        banned: true,
      },
    };
    verifyWebhookMock.mockResolvedValue(updatedEvent as never);
    prismaMock.user.findUnique.mockResolvedValue(ROW);
    prismaMock.user.update.mockResolvedValue({ ...ROW, role: "BANNED" });
    prismaMock.roleChangeLog.create.mockResolvedValue({ id: "log_1" });

    const res = await postEvent(updatedEvent, "msg_ban");
    expect(res.status).toBe(200);
    expect(prismaMock.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "row_1" },
        data: expect.objectContaining({
          role: "BANNED",
          email: "user@example.com",
        }),
      }),
    );
    expect(prismaMock.roleChangeLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          targetId: "row_1",
          changedById: null,
          fromRole: "CUSTOMER",
          toRole: "BANNED",
        }),
      }),
    );
    expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);
  });
});
