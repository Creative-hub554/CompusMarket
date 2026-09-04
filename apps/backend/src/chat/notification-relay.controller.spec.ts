import { beforeEach, describe, expect, it, vi } from "vitest";
import { notificationEvents, NOTIFICATION_CREATED } from "../realtime/notification.events";
import { NotificationRelayController } from "./notification-relay.controller";

// The InternalTokenGuard is exercised by its own spec; here we unit-test the
// relay behaviour (resolve actor → emit the same event the gateway listens for).
const prismaMock = {
  user: { findUnique: vi.fn() },
};

describe("NotificationRelayController", () => {
  let controller: NotificationRelayController;
  let emitSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    controller = new NotificationRelayController(prismaMock as never);
    emitSpy = vi.spyOn(notificationEvents, "emit").mockImplementation(() => true);
  });

  it("emits the created-notification event with a DB-resolved actor", async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: "admin-1",
      name: "Kim",
      username: "kim",
      image: null,
    });

    await controller.deliver({
      userId: "u1",
      actorId: "admin-1",
      kind: "REPORT_RESOLVED",
      message: "dismissed your report as unfounded.",
    });

    expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
      where: { id: "admin-1" },
      select: { id: true, name: true, username: true, image: true },
    });
    expect(emitSpy).toHaveBeenCalledWith(
      NOTIFICATION_CREATED,
      expect.objectContaining({
        userId: "u1",
        actorId: "admin-1",
        kind: "REPORT_RESOLVED",
        entityId: null,
        message: "dismissed your report as unfounded.",
        readAt: null,
        actor: { id: "admin-1", name: "Kim", username: "kim", image: null },
      }),
    );
  });

  it("passes the entity id through when provided", async () => {
    prismaMock.user.findUnique.mockResolvedValue({ id: "admin-1", name: null, username: null, image: null });

    await controller.deliver({
      userId: "u1",
      actorId: "admin-1",
      kind: "MESSAGE",
      entityId: "t-9",
      message: "hello",
    });

    expect(emitSpy).toHaveBeenCalledWith(
      NOTIFICATION_CREATED,
      expect.objectContaining({ entityId: "t-9" }),
    );
  });

  it("is a no-op when the acting user no longer exists", async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);

    await controller.deliver({ userId: "u1", actorId: "gone", kind: "REPORT_RESOLVED" });

    expect(emitSpy).not.toHaveBeenCalled();
  });
});
