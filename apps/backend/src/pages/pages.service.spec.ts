import { beforeEach, describe, expect, it, vi } from "vitest";
import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from "@nestjs/common";
import { PagesService } from "./pages.service";
import { PrismaService } from "../prisma/prisma.service";
import { PostsService } from "../social/posts.service";
import { NotificationsService } from "../social/notifications.service";

const mockPrisma = {
  page: {
    create: vi.fn(),
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  pageMember: {
    findUnique: vi.fn(),
    upsert: vi.fn(),
    delete: vi.fn(),
    findMany: vi.fn(),
  },
  pageFollow: {
    create: vi.fn(),
    deleteMany: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
    count: vi.fn(),
  },
  user: {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    updateMany: vi.fn(),
  },
  sellerProfile: { findUnique: vi.fn() },
  post: {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
    aggregate: vi.fn(),
  },
  reaction: { count: vi.fn() },
  comment: { count: vi.fn() },
  thread: { findUnique: vi.fn(), create: vi.fn() },
  threadParticipant: { upsert: vi.fn() },
  product: { findMany: vi.fn() },
  $transaction: vi.fn(),
};

const mockPosts = { create: vi.fn(), byPage: vi.fn() };
const mockNotifications = { notify: vi.fn(async () => undefined) };

vi.mock("../prisma/prisma.service", () => ({ PrismaService: class {} }));
vi.mock("../social/posts.service", () => ({ PostsService: class {} }));
vi.mock("../social/notifications.service", () => ({ NotificationsService: class {} }));

function service() {
  return new PagesService(
    mockPrisma as unknown as PrismaService,
    mockPosts as unknown as PostsService,
    mockNotifications as unknown as NotificationsService
  );
}

const PAGE = {
  id: "p1",
  name: "Corner Coffee",
  username: "cornercoffee",
  category: "Restaurant",
  description: "Best coffee in town",
  image: null,
  coverImage: null,
  phone: null,
  ownerId: "u1",
  createdAt: new Date(),
};

describe("PagesService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma.$transaction.mockImplementation(async (ops: unknown[]) => {
      // First op checks users, second checks pages (assertUsernameFree).
      const [userOp, pageOp] = ops as Array<{ where: { username?: string } }>;
      const username = userOp?.where?.username ?? pageOp?.where?.username ?? "";
      mockPrisma.user.findFirst.mockResolvedValueOnce(null);
      mockPrisma.page.findFirst.mockResolvedValueOnce(null);
      void username;
      return [null, null];
    });
    mockPrisma.sellerProfile.findUnique.mockResolvedValue(null);
  });

  describe("create", () => {
    it("creates a page and makes the creator OWNER", async () => {
      mockPrisma.page.create.mockResolvedValue(PAGE);
      const svc = service();
      const result = await svc.create("u1", {
        name: "Corner Coffee",
        username: "cornercoffee",
        category: "Restaurant",
      });
      expect(mockPrisma.page.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            ownerId: "u1",
            members: { create: { userId: "u1", role: "OWNER" } },
          }),
        })
      );
      expect(result.viewerRole).toBe("OWNER");
      expect(result.followerCount).toBe(0);
    });

    it("rejects a username taken by a user", async () => {
      mockPrisma.$transaction.mockResolvedValue([{ id: "u9" }, null]);
      const svc = service();
      await expect(
        svc.create("u1", { name: "X", username: "taken", category: "Shop" })
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it("rejects a username taken by another page", async () => {
      mockPrisma.$transaction.mockResolvedValue([null, { id: "p9" }]);
      const svc = service();
      await expect(
        svc.create("u1", { name: "X", username: "taken", category: "Shop" })
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe("roles", () => {
    it("lets an EDITOR post as the page", async () => {
      mockPrisma.pageMember.findUnique.mockResolvedValue({ role: "EDITOR" });
      mockPrisma.page.findUnique.mockResolvedValue(PAGE);
      mockPosts.create.mockResolvedValue({ id: "post1" });
      const svc = service();
      await svc.createPagePost("p1", "u2", { content: "hello" });
      expect(mockPosts.create).toHaveBeenCalledWith("u2", { content: "hello" }, undefined, "p1");
    });

    it("blocks a non-member from posting as the page", async () => {
      mockPrisma.pageMember.findUnique.mockResolvedValue(null);
      const svc = service();
      await expect(
        svc.createPagePost("p1", "u-outsider", { content: "hi" })
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(mockPosts.create).not.toHaveBeenCalled();
    });

    it("lets the OWNER add a member but an EDITOR not", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: "u3" });
      mockPrisma.pageMember.upsert.mockResolvedValue({ userId: "u3", role: "EDITOR" });

      mockPrisma.pageMember.findUnique.mockResolvedValueOnce({ role: "OWNER" });
      const svc = service();
      await svc.addMember("p1", "u1", "u3", "EDITOR");
      expect(mockPrisma.pageMember.upsert).toHaveBeenCalled();

      mockPrisma.pageMember.findUnique.mockResolvedValueOnce({ role: "EDITOR" });
      await expect(svc.addMember("p1", "u2", "u3", "EDITOR")).rejects.toBeInstanceOf(
        ForbiddenException
      );
    });

    it("never removes the page owner from members", async () => {
      mockPrisma.page.findUnique.mockResolvedValue({ ownerId: "u1" });
      mockPrisma.pageMember.findUnique.mockResolvedValue({ role: "OWNER" });
      const svc = service();
      await expect(svc.removeMember("p1", "u1", "u1")).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe("follow", () => {
    it("notifies the page owner on a fresh follow", async () => {
      mockPrisma.page.findUnique.mockResolvedValue(PAGE);
      mockPrisma.pageFollow.create.mockResolvedValue({ id: "f1" });
      mockPrisma.pageFollow.count.mockResolvedValue(1);
      const svc = service();
      const res = await svc.follow("p1", "u2");
      expect(res.following).toBe(true);
      expect(mockNotifications.notify).toHaveBeenCalledWith(
        expect.objectContaining({ userId: "u1", actorId: "u2", kind: "PAGE_FOLLOW", entityId: "p1" })
      );
    });

    it("is idempotent — no notification when already following", async () => {
      mockPrisma.page.findUnique.mockResolvedValue(PAGE);
      mockPrisma.pageFollow.create.mockRejectedValue(
        Object.assign(new Error("unique"), { code: "P2002" })
      );
      mockPrisma.pageFollow.count.mockResolvedValue(1);
      const svc = service();
      const res = await svc.follow("p1", "u2");
      expect(res.following).toBe(false);
      expect(mockNotifications.notify).not.toHaveBeenCalled();
    });
  });

  describe("messaging", () => {
    it("find-or-creates one thread per (page, customer)", async () => {
      mockPrisma.page.findUnique.mockResolvedValue(PAGE);
      mockPrisma.thread.findUnique.mockResolvedValueOnce(null).mockResolvedValueOnce(null);
      mockPrisma.thread.create.mockResolvedValue({ id: "t1" });
      const svc = service();
      const res = await svc.getOrCreateThread("p1", "u2");
      expect(res.id).toBe("t1");
      expect(mockPrisma.thread.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            pageId: "p1",
            participants: { create: [{ userId: "u2" }] },
          }),
        })
      );
    });

    it("returns the existing thread on later opens", async () => {
      mockPrisma.page.findUnique.mockResolvedValue(PAGE);
      mockPrisma.thread.findUnique.mockReset();
      mockPrisma.thread.findUnique.mockResolvedValue({ id: "t1" });
      const svc = service();
      const res = await svc.getOrCreateThread("p1", "u2");
      expect(res.id).toBe("t1");
      expect(mockPrisma.thread.create).not.toHaveBeenCalled();
    });

    it("refuses the owner messaging their own page", async () => {
      mockPrisma.page.findUnique.mockResolvedValue(PAGE);
      const svc = service();
      await expect(svc.getOrCreateThread("p1", "u1")).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe("shop", () => {
    it("returns products only for an APPROVED owner seller profile", async () => {
      mockPrisma.page.findUnique.mockResolvedValue({
        id: "p1",
        owner: { sellerProfile: { verificationStatus: "APPROVED" } },
      });
      mockPrisma.product.findMany.mockResolvedValue([{ id: "pr1" }]);
      const svc = service();
      const res = await svc.pageProducts("p1");
      expect(res.verified).toBe(true);
      expect(res.items).toHaveLength(1);
    });

    it("returns an empty shop when the owner is not a verified seller", async () => {
      mockPrisma.page.findUnique.mockResolvedValue({
        id: "p1",
        owner: { sellerProfile: null },
      });
      const svc = service();
      const res = await svc.pageProducts("p1");
      expect(res.verified).toBe(false);
      expect(res.items).toEqual([]);
      expect(mockPrisma.product.findMany).not.toHaveBeenCalled();
    });
  });

  describe("boost", () => {
    it("boosts a page post and returns the expiry", async () => {
      mockPrisma.pageMember.findUnique.mockResolvedValue({ role: "OWNER" });
      mockPrisma.post.findUnique.mockResolvedValue({
        id: "post1",
        pageId: "p1",
        boostedUntil: null,
      });
      mockPrisma.post.update.mockResolvedValue({});
      const svc = service();
      const res = await svc.boostPost("p1", "post1", "u1");
      expect(res.costCredits).toBe(0);
      expect(res.boostedUntil.getTime()).toBeGreaterThan(Date.now());
      expect(mockPrisma.post.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: "post1" } })
      );
    });

    it("rejects boosting another page's post", async () => {
      mockPrisma.pageMember.findUnique.mockResolvedValue({ role: "OWNER" });
      mockPrisma.post.findUnique.mockResolvedValue({
        id: "post1",
        pageId: "p-other",
        boostedUntil: null,
      });
      const svc = service();
      await expect(svc.boostPost("p1", "post1", "u1")).rejects.toBeInstanceOf(NotFoundException);
    });

    it("rejects a second active boost", async () => {
      mockPrisma.pageMember.findUnique.mockResolvedValue({ role: "OWNER" });
      mockPrisma.post.findUnique.mockResolvedValue({
        id: "post1",
        pageId: "p1",
        boostedUntil: new Date(Date.now() + 60_000),
      });
      const svc = service();
      await expect(svc.boostPost("p1", "post1", "u1")).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe("insights", () => {
    it("aggregates follower/post stats for staff", async () => {
      mockPrisma.pageMember.findUnique.mockResolvedValue({ role: "EDITOR" });
      mockPrisma.pageFollow.count.mockResolvedValue(42);
      mockPrisma.post.aggregate.mockResolvedValue({ _sum: { impressions: 100 }, _count: 5 });
      mockPrisma.post.findMany.mockResolvedValue([]);
      mockPrisma.reaction.count.mockResolvedValue(7);
      mockPrisma.comment.count.mockResolvedValue(3);
      const svc = service();
      const res = await svc.insights("p1", "u1");
      expect(res.followers).toBe(42);
      expect(res.newFollowers).toBe(42);
      expect(res.impressions).toBe(100);
      expect(res.reactions).toBe(7);
      expect(res.comments).toBe(3);
    });

    it("blocks outsiders from insights", async () => {
      mockPrisma.pageMember.findUnique.mockResolvedValue(null);
      const svc = service();
      await expect(svc.insights("p1", "u-outsider")).rejects.toBeInstanceOf(ForbiddenException);
    });
  });
});
