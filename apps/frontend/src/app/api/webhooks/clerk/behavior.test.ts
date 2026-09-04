/**
 * Behavioral verification of the webhook pipeline with REAL Svix signature
 * verification (no mocking of @clerk/nextjs/webhooks): a payload is signed
 * with the Svix HMAC algorithm exactly as Clerk delivers it, and the full
 * route → handler → dedupe chain is driven through POST. Only the database
 * plane is mocked (no local Postgres); every other layer is the real code.
 */
import { createHmac } from "node:crypto";
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { clerkClientMock, prismaMock } = vi.hoisted(() => ({
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

vi.mock("@clerk/nextjs/server", () => ({ clerkClient: clerkClientMock }));
vi.mock("@theo/database", () => ({ prisma: prismaMock, Role: {} }));
// NOTE: @clerk/nextjs/webhooks is deliberately NOT mocked — real verifyWebhook.

import { POST } from "./route";

// Clerk/Svix secrets are `whsec_` + base64 of the RAW key bytes; the verifier
// base64-decodes the secret and HMACs with those bytes over `id.seconds.body`.
const RAW_KEY = Buffer.from("behavioral-run-raw-secret-key-0123456789abcdef");
const SECRET = `whsec_${RAW_KEY.toString("base64")}`;
const WRONG_SECRET = Buffer.from(
  "a-different-wrong-raw-key-abcdefghijklmnopqrt",
);
const ROW = {
  id: "row_1",
  email: "a@example.com",
  role: "CUSTOMER",
  clerkId: null,
  emailVerified: null,
};

/** Svix signs `msgId.seconds.body` with HMAC-SHA256, sent as `v1,<b64>`. */
function svixSign(id: string, ts: string, body: string, key = RAW_KEY): string {
  return `v1,${createHmac("sha256", key).update(`${id}.${ts}.${body}`).digest("base64")}`;
}

function signedRequest(
  payload: object,
  svixId = `msg_${Math.random()}`,
  overrides: Record<string, string> = {},
) {
  const body = JSON.stringify(payload);
  const ts = Math.floor(Date.now() / 1000).toString();
  const headers: Record<string, string> = {
    "content-type": "application/json",
    "svix-id": svixId,
    "svix-timestamp": ts,
    "svix-signature": svixSign(svixId, ts, body),
    ...overrides,
  };
  return new NextRequest("http://localhost/api/webhooks/clerk", {
    method: "POST",
    headers,
    body,
  });
}

const CREATED_EVENT = {
  type: "user.created",
  data: {
    id: "user_real_1",
    first_name: "Srey",
    last_name: "Meas",
    image_url: null,
    primary_email_address_id: "e1",
    email_addresses: [{ id: "e1", email_address: "a@example.com" }],
  },
};

beforeEach(() => {
  vi.clearAllMocks();
  process.env.CLERK_WEBHOOK_SECRET = SECRET;
  clerkClientMock.mockResolvedValue({
    users: { updateUserMetadata: vi.fn().mockResolvedValue({}) },
  });
  prismaMock.$transaction.mockImplementation((ops: Promise<unknown>[]) =>
    Promise.all(ops),
  );
});

describe("POST /api/webhooks/clerk — real signature verification", () => {
  it("accepts a correctly Svix-signed delivery and creates the row", async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);
    prismaMock.user.create.mockResolvedValue(ROW);

    const res = await POST(signedRequest(CREATED_EVENT));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ received: true });
    expect(prismaMock.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          clerkId: "user_real_1",
          email: "a@example.com",
          name: "Srey Meas",
        }),
      }),
    );
  });

  it("rejects a valid signature over a DIFFERENT body (tampered payload)", async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);
    // Sign the original event, then swap the delivered body mid-flight.
    const body = JSON.stringify(CREATED_EVENT);
    const tamperedBody = JSON.stringify({
      ...CREATED_EVENT,
      data: { ...CREATED_EVENT.data, id: "user_evil" },
    });
    const ts = Math.floor(Date.now() / 1000).toString();
    const headers = {
      "content-type": "application/json",
      "svix-id": "msg_tamper",
      "svix-timestamp": ts,
      "svix-signature": svixSign("msg_tamper", ts, body),
    };
    const res = await POST(
      new NextRequest("http://localhost/api/webhooks/clerk", {
        method: "POST",
        headers,
        body: tamperedBody,
      }),
    );
    expect(res.status).toBe(400);
    expect(prismaMock.user.create).not.toHaveBeenCalled();
  });

  it("rejects a signature from the wrong secret", async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);
    const body = JSON.stringify(CREATED_EVENT);
    const ts = Math.floor(Date.now() / 1000).toString();
    const other = svixSign("msg_x", ts, body, WRONG_SECRET);
    const req = new NextRequest("http://localhost/api/webhooks/clerk", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "svix-id": "msg_x",
        "svix-timestamp": ts,
        "svix-signature": other,
      },
      body,
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    expect(prismaMock.user.create).not.toHaveBeenCalled();
  });

  it("verifies, processes, dedupes a real retry, and re-processes after failure — full lifecycle", async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);
    prismaMock.user.create.mockResolvedValueOnce(ROW); // first processed

    const id = "msg_lifecycle";
    // 1. First delivery succeeds.
    expect((await POST(signedRequest(CREATED_EVENT, id))).status).toBe(200);

    // 2. Svix retry of the SAME delivery id within the window -> deduped, no re-apply.
    prismaMock.user.create.mockClear();
    const dup = await POST(signedRequest(CREATED_EVENT, id));
    expect(dup.status).toBe(200);
    expect(await dup.json()).toEqual({ received: true, duplicate: true });
    expect(prismaMock.user.create).not.toHaveBeenCalled();

    // 3. A NEW event fails once -> 500, NOT remembered.
    prismaMock.user.create.mockRejectedValueOnce(new Error("db down"));
    const failed = await POST(signedRequest(CREATED_EVENT, "msg_fail"));
    expect(failed.status).toBe(500);

    // 4. Its retry is allowed through and succeeds.
    prismaMock.user.create.mockResolvedValue(ROW);
    const retried = await POST(signedRequest(CREATED_EVENT, "msg_fail"));
    expect(retried.status).toBe(200);
    expect(await retried.json()).toEqual({ received: true });
  });
});
