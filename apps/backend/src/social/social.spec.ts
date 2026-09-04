import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  ConflictException,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";
import { PostsService } from "./posts.service";
import { FollowsService } from "./follows.service";
import { StoriesService } from "./stories.service";
import { ProfilesService } from "./profiles.service";
import { NotificationsService } from "./notifications.service";
import { notificationEvents, NOTIFICATION_CREATED } from "../realtime/notification.events";
import { PrismaService } from "../prisma/prisma.service";
import { Prisma } from "@theo/database";

function makePrisma() {
  const db = {
    post: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    group: {
      findUnique: vi.fn(),
    },
    reaction: {
      findUnique: vi.fn(),
      findMany: vi.fn().mockResolvedValue([]),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      groupBy: vi.fn().mockResolvedValue([]),
    },
    comment: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
    },
    follow: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      deleteMany: vi.fn(),
      groupBy: vi.fn(),
    },
    groupMember: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
    story: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      delete: vi.fn(),
    },
    storyView: {
      create: vi.fn(),
    },
    bookmark: {
      findUnique: vi.fn(),
      findMany: vi.fn().mockResolvedValue([]),
      create: vi.fn(),
      delete: vi.fn(),
    },
    notification: {
      create: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      count: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
  };
  db.$transaction = vi.fn(
    async (cb: (tx: never) => unknown): Promise<unknown> => cb(db as never)
  );
  return db;
}

function makeNotif() {
  return {
    notify: vi.fn(),
    notifyReaction: vi.fn(),
    list: vi.fn(),
    unreadCount: vi.fn(),
    markRead: vi.fn(),
  };
}

const dbPost = {
  id: "p1",
  content: "hello",
  createdAt: new Date("2026-01-01T00:00:00Z"),
  author: { id: "u1", name: "Alice", username: "alice", image: null },
  media: [{ id: "m1", kind: "IMAGE", url: "x.webp", thumbUrl: null, position: 0 }],
  reactions: [{ emoji: "👍", userId: "u2" }],
  bookmarks: [],
  _count: { comments: 3 },
};

/** The visibility OR queryFeed now ANDs into read scopes. */
const NO_GROUP_VISIBILITY = {
  OR: [{ groupId: null }, { group: { is: { privacy: "PUBLIC" } } }],
};

describe("PostsService", () => {
  let prisma: ReturnType<typeof makePrisma>;
  let notif: ReturnType<typeof makeNotif>;
  let service: PostsService;

  beforeEach(() => {
    vi.clearAllMocks();
    prisma = makePrisma();
    notif = makeNotif();
    service = new PostsService(
      prisma as unknown as PrismaService,
      notif as unknown as NotificationsService
    );
  });

  describe("create", () => {
    it("creates a text-only post and maps reactions", async () => {
      prisma.post.create.mockResolvedValue(dbPost);
      const result = await service.create("u1", { content: "hello" });
      expect(result.id).toBe("p1");
      expect(result.commentCount).toBe(3);
      expect(result.reactions).toEqual([{ emoji: "👍", count: 1 }]);
      expect(result.viewerReaction).toBeNull();
      expect(result.media).toHaveLength(1);
    });

    it("rejects an empty post", async () => {
      await expect(service.create("u1", {})).rejects.toThrow(BadRequestException);
    });

    it("rejects a video combined with images", async () => {
      await expect(
        service.create("u1", {
          content: "x",
          media: [
            { url: "v.mp4", kind: "VIDEO" },
            { url: "i.webp", kind: "IMAGE" },
          ],
        })
      ).rejects.toThrow(BadRequestException);
    });

    it("rejects more than one video", async () => {
      await expect(
        service.create("u1", {
          content: "x",
          media: [
            { url: "a.mp4", kind: "VIDEO" },
            { url: "b.mp4", kind: "VIDEO" },
          ],
        })
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe("feed", () => {
    it("includes own posts plus followed authors' wall and public-group posts", async () => {
      prisma.follow.findMany.mockResolvedValue([{ followingId: "u2" }]);
      prisma.groupMember.findMany.mockResolvedValue([]);
      prisma.post.findMany.mockResolvedValue([dbPost]);
      const result = await service.feed("u1");
      expect(prisma.post.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            AND: [
              {
                OR: [
                  { authorId: { in: ["u2", "u1"] } },
                  { groupId: { in: [] } },
                ],
              },
              NO_GROUP_VISIBILITY,
            ],
          },
        })
      );
      expect(result.items).toHaveLength(1);
      expect(result.nextCursor).toBeNull();
    });

    it("includes posts from groups the viewer belongs to", async () => {
      prisma.follow.findMany.mockResolvedValue([]);
      prisma.groupMember.findMany.mockResolvedValue([{ groupId: "g1" }]);
      prisma.post.findMany.mockResolvedValue([dbPost]);
      await service.feed("u1");
      expect(prisma.post.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            AND: [
              {
                OR: [
                  { authorId: { in: ["u1"] } },
                  { groupId: { in: ["g1"] } },
                ],
              },
              {
                OR: [
                  { groupId: null },
                  { group: { is: { privacy: "PUBLIC" } } },
                  { groupId: { in: ["g1"] } },
                ],
              },
            ],
          },
        })
      );
    });

    it("does not surface private-group posts of followed authors when the viewer is not a member", async () => {
      prisma.follow.findMany.mockResolvedValue([{ followingId: "u2" }]);
      // Viewer belongs to no groups, so the visibility scope only admits wall
      // posts and PUBLIC-group posts — a PRIVATE group post by u2 cannot match.
      prisma.groupMember.findMany.mockResolvedValue([]);
      prisma.post.findMany.mockResolvedValue([dbPost]);
      await service.feed("u1");
      const where = (prisma.post.findMany.mock.calls[0][0] as { where: unknown }).where;
      expect(where).toEqual({
        AND: [
          {
            OR: [
              { authorId: { in: ["u2", "u1"] } },
              { groupId: { in: [] } },
            ],
          },
          NO_GROUP_VISIBILITY,
        ],
      });
    });
  });

  describe("findOne", () => {
    it("forbids a non-member from viewing a post in a private group", async () => {
      prisma.post.findUnique.mockResolvedValue({ id: "p1", groupId: "g1" });
      prisma.group.findUnique.mockResolvedValue({ privacy: "PRIVATE" });
      prisma.groupMember.findUnique.mockResolvedValue(null);

      await expect(service.findOne("p1", "outsider")).rejects.toThrow(ForbiddenException);
      expect(prisma.groupMember.findUnique).toHaveBeenCalledWith({
        where: { groupId_userId: { groupId: "g1", userId: "outsider" } },
        select: { id: true },
      });
    });

    it("forbids anonymous viewers from reading a private-group post", async () => {
      prisma.post.findUnique.mockResolvedValue({ id: "p1", groupId: "g1" });
      prisma.group.findUnique.mockResolvedValue({ privacy: "PRIVATE" });

      await expect(service.findOne("p1")).rejects.toThrow(ForbiddenException);
      expect(prisma.groupMember.findUnique).not.toHaveBeenCalled();
    });

    it("allows a member of the private group to read the post", async () => {
      prisma.post.findUnique.mockResolvedValue({ ...dbPost, groupId: "g1" });
      prisma.group.findUnique.mockResolvedValue({ privacy: "PRIVATE" });
      prisma.groupMember.findUnique.mockResolvedValue({ id: "m1" });

      const result = await service.findOne("p1", "u1");
      expect(result.id).toBe("p1");
    });

    it("allows a non-member to read a post in a public group", async () => {
      prisma.post.findUnique.mockResolvedValue({ ...dbPost, groupId: "g1" });
      prisma.group.findUnique.mockResolvedValue({ privacy: "PUBLIC" });

      const result = await service.findOne("p1", "outsider");
      expect(result.id).toBe("p1");
      expect(prisma.groupMember.findUnique).not.toHaveBeenCalled();
    });

    it("allows reading a wall post (no group)", async () => {
      prisma.post.findUnique.mockResolvedValue(dbPost);
      const result = await service.findOne("p1");
      expect(result.id).toBe("p1");
      expect(prisma.group.findUnique).not.toHaveBeenCalled();
    });
  });

  describe("byAuthor", () => {
    it("scopes out posts from private groups the viewer is not a member of", async () => {
      prisma.groupMember.findMany.mockResolvedValue([]);
      prisma.post.findMany.mockResolvedValue([dbPost]);

      await service.byAuthor("u2", "u1");

      const where = (prisma.post.findMany.mock.calls[0][0] as { where: unknown }).where;
      expect(where).toEqual({
        AND: [{ authorId: "u2" }, NO_GROUP_VISIBILITY],
      });
    });

    it("keeps the author's private-group posts when the viewer belongs to that group", async () => {
      prisma.groupMember.findMany.mockResolvedValue([{ groupId: "g1" }]);
      prisma.post.findMany.mockResolvedValue([dbPost]);

      await service.byAuthor("u2", "u1");

      const where = (prisma.post.findMany.mock.calls[0][0] as { where: unknown }).where;
      expect(where).toEqual({
        AND: [
          { authorId: "u2" },
          {
            OR: [
              { groupId: null },
              { group: { is: { privacy: "PUBLIC" } } },
              { groupId: { in: ["g1"] } },
            ],
          },
        ],
      });
    });

    it("shows only wall and public-group posts to anonymous viewers", async () => {
      prisma.post.findMany.mockResolvedValue([dbPost]);

      await service.byAuthor("u2");

      const where = (prisma.post.findMany.mock.calls[0][0] as { where: unknown }).where;
      expect(where).toEqual({ AND: [{ authorId: "u2" }, NO_GROUP_VISIBILITY] });
      expect(prisma.groupMember.findMany).not.toHaveBeenCalled();
    });
  });

  describe("react", () => {
    it("toggles off when reacting with the same emoji", async () => {
      prisma.post.findUnique.mockResolvedValue({ authorId: "u1" });
      prisma.reaction.findUnique.mockResolvedValue({ id: "r1", emoji: "👍" });
      prisma.reaction.groupBy.mockResolvedValue([]);
      const result = await service.react("u2", "p1", "👍");
      expect(result.reacted).toBe(false);
      expect(prisma.reaction.delete).toHaveBeenCalledWith({ where: { id: "r1" } });
      expect(notif.notifyReaction).not.toHaveBeenCalled();
    });

    it("switches emoji and notifies the author", async () => {
      prisma.post.findUnique.mockResolvedValue({ authorId: "u1" });
      prisma.reaction.findUnique.mockResolvedValue({ id: "r1", emoji: "👎" });
      prisma.reaction.groupBy.mockResolvedValue([{ emoji: "👍", _count: { emoji: 1 } }]);
      const result = await service.react("u2", "p1", "👍");
      expect(result.reacted).toBe(true);
      expect(prisma.reaction.update).toHaveBeenCalled();
      expect(notif.notifyReaction).toHaveBeenCalledWith({
        userId: "u1",
        actorId: "u2",
        entityId: "p1",
        emoji: "👍",
      });
      expect(result.reactions).toEqual([{ emoji: "👍", count: 1 }]);
    });

    it("forbids a non-member from reacting to a private-group post", async () => {
      prisma.post.findUnique.mockResolvedValue({ authorId: "u1", groupId: "g1" });
      prisma.group.findUnique.mockResolvedValue({ privacy: "PRIVATE" });
      prisma.groupMember.findUnique.mockResolvedValue(null);

      await expect(service.react("outsider", "p1", "👍")).rejects.toThrow(ForbiddenException);
      expect(prisma.reaction.findUnique).not.toHaveBeenCalled();
    });

    it("allows a member to react to a private-group post", async () => {
      prisma.post.findUnique.mockResolvedValue({ authorId: "u1", groupId: "g1" });
      prisma.group.findUnique.mockResolvedValue({ privacy: "PRIVATE" });
      prisma.groupMember.findUnique.mockResolvedValue({ id: "m1" });
      prisma.reaction.findUnique.mockResolvedValue({ id: "r1", emoji: "👍" });

      const result = await service.react("u2", "p1", "👍");
      expect(result.reacted).toBe(false);
      expect(prisma.reaction.delete).toHaveBeenCalled();
    });
  });

  describe("comment", () => {
    it("notifies the post author", async () => {
      prisma.post.findUnique.mockResolvedValue({ authorId: "u1" });
      prisma.comment.create.mockResolvedValue({
        id: "c1",
        content: "nice",
        parentId: null,
        createdAt: new Date(),
        author: { id: "u2", name: "Bob", username: "bob", image: null },
      });
      await service.comment("u2", "p1", { content: "nice" });
      expect(notif.notify).toHaveBeenCalledTimes(1);
      expect(notif.notify).toHaveBeenCalledWith(
        expect.objectContaining({ userId: "u1", actorId: "u2", kind: "COMMENT" })
      );
    });

    it("rejects a parent comment from another post", async () => {
      prisma.post.findUnique.mockResolvedValue({ authorId: "u1" });
      prisma.comment.findUnique.mockResolvedValue({ postId: "other-post", authorId: "u3" });
      await expect(
        service.comment("u2", "p1", { content: "reply", parentId: "cX" })
      ).rejects.toThrow(BadRequestException);
    });

    it("forbids a non-member from commenting on a private-group post", async () => {
      prisma.post.findUnique.mockResolvedValue({ authorId: "u1", groupId: "g1" });
      prisma.group.findUnique.mockResolvedValue({ privacy: "PRIVATE" });
      prisma.groupMember.findUnique.mockResolvedValue(null);

      await expect(service.comment("outsider", "p1", { content: "hi" })).rejects.toThrow(
        ForbiddenException
      );
      expect(prisma.comment.create).not.toHaveBeenCalled();
    });

    it("allows a member to comment on a private-group post", async () => {
      prisma.post.findUnique.mockResolvedValue({ authorId: "u1", groupId: "g1" });
      prisma.group.findUnique.mockResolvedValue({ privacy: "PRIVATE" });
      prisma.groupMember.findUnique.mockResolvedValue({ id: "m1" });
      prisma.comment.create.mockResolvedValue({
        id: "c1",
        content: "hello from the group",
        parentId: null,
        createdAt: new Date(),
        author: { id: "u2", name: "Bob", username: "bob", image: null },
      });

      await service.comment("u2", "p1", { content: "hello from the group" });
      expect(prisma.comment.create).toHaveBeenCalled();
      expect(notif.notify).toHaveBeenCalledWith(
        expect.objectContaining({ userId: "u1", actorId: "u2", kind: "COMMENT" })
      );
    });
  });

  describe("listComments", () => {
    it("returns comments of a private-group post for a member", async () => {
      prisma.post.findUnique.mockResolvedValue({ id: "p1", groupId: "g1" });
      prisma.group.findUnique.mockResolvedValue({ privacy: "PRIVATE" });
      prisma.groupMember.findUnique.mockResolvedValue({ id: "m1" });
      const comment = {
        id: "c1",
        content: "nice",
        createdAt: new Date(),
        author: { id: "u2", name: "Bob", username: "bob", image: null },
      };
      prisma.comment.findMany.mockResolvedValue([comment]);

      const result = await service.listComments("p1", "u1");

      expect(prisma.comment.findMany).toHaveBeenCalledWith({
        where: { postId: "p1" },
        orderBy: { createdAt: "asc" },
        include: {
          author: { select: { id: true, name: true, username: true, image: true } },
        },
      });
      expect(result).toEqual([comment]);
    });

    it("forbids a non-member from listing comments of a private-group post", async () => {
      prisma.post.findUnique.mockResolvedValue({ id: "p1", groupId: "g1" });
      prisma.group.findUnique.mockResolvedValue({ privacy: "PRIVATE" });
      prisma.groupMember.findUnique.mockResolvedValue(null);

      await expect(service.listComments("p1", "outsider")).rejects.toThrow(ForbiddenException);
      expect(prisma.comment.findMany).not.toHaveBeenCalled();
    });

    it("forbids anonymous comment listing on a private-group post", async () => {
      prisma.post.findUnique.mockResolvedValue({ id: "p1", groupId: "g1" });
      prisma.group.findUnique.mockResolvedValue({ privacy: "PRIVATE" });

      await expect(service.listComments("p1")).rejects.toThrow(ForbiddenException);
      expect(prisma.comment.findMany).not.toHaveBeenCalled();
    });

    it("throws NotFound for an unknown post", async () => {
      prisma.post.findUnique.mockResolvedValue(null);
      await expect(service.listComments("missing")).rejects.toThrow(NotFoundException);
    });
  });

  describe("toggleBookmark", () => {
    it("forbids a non-member from bookmarking a private-group post", async () => {
      prisma.post.findUnique.mockResolvedValue({ id: "p1", groupId: "g1" });
      prisma.group.findUnique.mockResolvedValue({ privacy: "PRIVATE" });
      prisma.groupMember.findUnique.mockResolvedValue(null);

      await expect(service.toggleBookmark("outsider", "p1")).rejects.toThrow(ForbiddenException);
      expect(prisma.bookmark.findUnique).not.toHaveBeenCalled();
    });

    it("allows a member to bookmark a private-group post", async () => {
      prisma.post.findUnique.mockResolvedValue({ id: "p1", groupId: "g1" });
      prisma.group.findUnique.mockResolvedValue({ privacy: "PRIVATE" });
      prisma.groupMember.findUnique.mockResolvedValue({ id: "m1" });
      prisma.bookmark.findUnique.mockResolvedValue(null);
      prisma.bookmark.create.mockResolvedValue({});

      const result = await service.toggleBookmark("u1", "p1");

      expect(prisma.bookmark.create).toHaveBeenCalledWith({
        data: { postId: "p1", userId: "u1" },
      });
      expect(result).toEqual({ bookmarked: true });
    });

    it("removes an existing bookmark", async () => {
      prisma.post.findUnique.mockResolvedValue({ id: "p1" });
      prisma.bookmark.findUnique.mockResolvedValue({ id: "b1" });
      prisma.bookmark.delete.mockResolvedValue({});

      const result = await service.toggleBookmark("u1", "p1");

      expect(prisma.bookmark.delete).toHaveBeenCalledWith({ where: { id: "b1" } });
      expect(result).toEqual({ bookmarked: false });
    });

    it("nets two racing toggles to off when the loser's create hits the unique key", async () => {
      prisma.post.findUnique.mockResolvedValue({ id: "p1" });
      // Both requests read no bookmark, then the winner creates; the loser's
      // create fails with P2002 and must undo the winner's row instead of 500ing.
      prisma.bookmark.findUnique.mockResolvedValue(null);
      prisma.bookmark.create.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
          code: "P2002",
          clientVersion: "test",
        })
      );
      prisma.bookmark.delete.mockResolvedValue({});

      const result = await service.toggleBookmark("u1", "p1");

      expect(prisma.bookmark.delete).toHaveBeenCalledWith({
        where: { postId_userId: { postId: "p1", userId: "u1" } },
      });
      expect(result).toEqual({ bookmarked: false });
    });

    it("rethrows non-unique create failures", async () => {
      prisma.post.findUnique.mockResolvedValue({ id: "p1" });
      prisma.bookmark.findUnique.mockResolvedValue(null);
      prisma.bookmark.create.mockRejectedValue(new Error("connection reset"));

      await expect(service.toggleBookmark("u1", "p1")).rejects.toThrow("connection reset");
      expect(prisma.bookmark.delete).not.toHaveBeenCalled();
    });
  });

  describe("removeComment", () => {
    it("forbids deleting someone else's comment", async () => {
      prisma.comment.findUnique.mockResolvedValue({ authorId: "u3" });
      await expect(service.removeComment("c1", "u2")).rejects.toThrow(ForbiddenException);
    });
  });

  describe("private accounts", () => {
    const privateAuthor = {
      id: "u1",
      name: "Alice",
      username: "alice",
      image: null,
      accountPrivate: true,
    };

    it("hides a wall post from anonymous viewers", async () => {
      prisma.post.findUnique.mockResolvedValue({ ...dbPost, author: privateAuthor });
      await expect(service.findOne("p1")).rejects.toThrow(ForbiddenException);
      expect(prisma.follow.findUnique).not.toHaveBeenCalled();
    });

    it("hides a wall post from a non-follower", async () => {
      prisma.post.findUnique.mockResolvedValue({ ...dbPost, author: privateAuthor });
      prisma.follow.findUnique.mockResolvedValue(null);
      await expect(service.findOne("p1", "u2")).rejects.toThrow(ForbiddenException);
      expect(prisma.follow.findUnique).toHaveBeenCalledWith({
        where: {
          followerId_followingId: { followerId: "u2", followingId: "u1" },
        },
        select: { id: true },
      });
    });

    it("shows a wall post to a follower", async () => {
      prisma.post.findUnique.mockResolvedValue({ ...dbPost, author: privateAuthor });
      prisma.follow.findUnique.mockResolvedValue({ id: "f1" });
      const result = await service.findOne("p1", "u2");
      expect(result.id).toBe("p1");
    });

    it("shows the author their own wall posts without a follow lookup", async () => {
      prisma.post.findUnique.mockResolvedValue({ ...dbPost, author: privateAuthor });
      const result = await service.findOne("p1", "u1");
      expect(result.id).toBe("p1");
      expect(prisma.follow.findUnique).not.toHaveBeenCalled();
    });

    it("lets group members read the private account's group posts", async () => {
      // Group posts are governed by group visibility, not author privacy.
      prisma.post.findUnique.mockResolvedValue({
        ...dbPost,
        author: privateAuthor,
        groupId: "g1",
        group: { id: "g1", name: "G" },
      });
      const result = await service.findOne("p1", "u2");
      expect(result.id).toBe("p1");
      expect(prisma.follow.findUnique).not.toHaveBeenCalled();
    });

    it("scopes profile-post lists of a private account to followers", async () => {
      prisma.user.findUnique.mockResolvedValue({ accountPrivate: true });
      prisma.follow.findUnique.mockResolvedValue(null);
      await expect(service.byAuthor("u1", "u2")).rejects.toThrow(ForbiddenException);
      expect(prisma.post.findMany).not.toHaveBeenCalled();
    });

    it("allows a follower to list a private account's posts", async () => {
      prisma.user.findUnique.mockResolvedValue({ accountPrivate: true });
      prisma.follow.findUnique.mockResolvedValue({ id: "f1" });
      prisma.groupMember.findMany.mockResolvedValue([]);
      prisma.post.findMany.mockResolvedValue([]);
      await service.byAuthor("u1", "u2");
      expect(prisma.post.findMany).toHaveBeenCalled();
    });

    it("blocks reactions on a private account's wall post for non-followers", async () => {
      prisma.post.findUnique.mockResolvedValue({
        authorId: "u1",
        groupId: null,
        author: { accountPrivate: true },
      });
      prisma.follow.findUnique.mockResolvedValue(null);
      await expect(service.react("u2", "p1", "👍")).rejects.toThrow(ForbiddenException);
      expect(prisma.reaction.findUnique).not.toHaveBeenCalled();
    });

    it("blocks comments on a private account's wall post for non-followers", async () => {
      prisma.post.findUnique.mockResolvedValue({
        authorId: "u1",
        groupId: null,
        author: { accountPrivate: true },
      });
      prisma.follow.findUnique.mockResolvedValue(null);
      await expect(service.comment("u2", "p1", { content: "hi" })).rejects.toThrow(
        ForbiddenException
      );
      expect(prisma.comment.create).not.toHaveBeenCalled();
    });

    it("blocks bookmarking a private account's wall post for non-followers", async () => {
      prisma.post.findUnique.mockResolvedValue({
        id: "p1",
        authorId: "u1",
        groupId: null,
        author: { accountPrivate: true },
      });
      prisma.follow.findUnique.mockResolvedValue(null);
      await expect(service.toggleBookmark("u2", "p1")).rejects.toThrow(ForbiddenException);
    });

    it("allows a follower to react to a private account's wall post", async () => {
      prisma.post.findUnique.mockResolvedValue({
        authorId: "u1",
        groupId: null,
        author: { accountPrivate: true },
      });
      prisma.follow.findUnique.mockResolvedValue({ id: "f1" });
      prisma.reaction.findUnique.mockResolvedValue({ id: "r1", emoji: "👍" });

      const result = await service.react("u2", "p1", "👍");
      expect(result.reacted).toBe(false);
    });
  });
});

describe("FollowsService", () => {
  let prisma: ReturnType<typeof makePrisma>;
  let notif: ReturnType<typeof makeNotif>;
  let service: FollowsService;

  beforeEach(() => {
    vi.clearAllMocks();
    prisma = makePrisma();
    notif = makeNotif();
    service = new FollowsService(
      prisma as unknown as PrismaService,
      notif as unknown as NotificationsService
    );
  });

  it("rejects self-follow", async () => {
    await expect(service.follow("u1", "u1")).rejects.toThrow(BadRequestException);
  });

  it("creates the follow edge and notifies", async () => {
    prisma.user.findUnique.mockResolvedValue({ id: "u2" });
    prisma.follow.create.mockResolvedValue({});
    await service.follow("u1", "u2");
    expect(prisma.follow.create).toHaveBeenCalledWith({
      data: { followerId: "u1", followingId: "u2" },
    });
    expect(notif.notify).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "u2", actorId: "u1", kind: "FOLLOW" })
    );
  });

  it("ignores duplicates silently", async () => {
    prisma.user.findUnique.mockResolvedValue({ id: "u2" });
    prisma.follow.create.mockRejectedValue(new Error("P2002"));
    await expect(service.follow("u1", "u2")).resolves.toBeUndefined();
    expect(notif.notify).not.toHaveBeenCalled();
  });

  it("suggests popular unfollowed users", async () => {
    prisma.follow.findMany.mockResolvedValue([{ followingId: "u2" }]);
    prisma.follow.groupBy.mockResolvedValue([{ followingId: "u9", _count: { followingId: 5 } }]);
    prisma.user.findMany.mockResolvedValue([
      { id: "u9", name: "Zara", username: "zara", image: null, bio: null, _count: { followers: 5 } },
    ]);
    const result = await service.suggestions("u1");
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("u9");
  });
});

describe("StoriesService", () => {
  let prisma: ReturnType<typeof makePrisma>;
  let service: StoriesService;

  beforeEach(() => {
    vi.clearAllMocks();
    prisma = makePrisma();
    service = new StoriesService(prisma as unknown as PrismaService);
  });

  it("expires stories after 24 hours", async () => {
    prisma.story.create.mockResolvedValue({ id: "s1" });
    await service.create("u1", { mediaUrl: "a.webp", mediaKind: "IMAGE" });
    const args = prisma.story.create.mock.calls[0][0];
    const expiresAt = args.data.expiresAt as Date;
    const diff = expiresAt.getTime() - Date.now();
    expect(diff).toBeGreaterThan(24 * 3600 * 1000 - 5000);
    expect(diff).toBeLessThan(24 * 3600 * 1000 + 5000);
  });

  it("groups stories by author with own stories first", async () => {
    prisma.follow.findMany.mockResolvedValue([{ followingId: "u2" }]);
    prisma.story.findMany.mockResolvedValue([
      {
        id: "s2",
        author: { id: "u2", name: "Bob", username: "bob", image: null },
        mediaUrl: "b",
        mediaKind: "IMAGE",
        caption: null,
        createdAt: new Date(),
        views: [],
      },
      {
        id: "s1",
        author: { id: "u1", name: "Me", username: null, image: null },
        mediaUrl: "a",
        mediaKind: "IMAGE",
        caption: null,
        createdAt: new Date(),
        views: [{ userId: "u1" }],
      },
    ]);
    const groups = await service.feedForViewer("u1");
    expect(groups[0].author.id).toBe("u1");
    expect(groups[0].stories[0].viewed).toBe(true);
    expect(groups[1].author.id).toBe("u2");
    expect(groups[1].allViewed).toBe(false);
  });

  it("forbids deleting another user's story", async () => {
    prisma.story.findUnique.mockResolvedValue({ authorId: "u2" });
    await expect(service.remove("s1", "u1")).rejects.toThrow(ForbiddenException);
  });

  describe("view", () => {
    const liveStory = (authorId: string) => ({
      id: "s1",
      authorId,
      expiresAt: new Date(Date.now() + 60_000),
    });

    it("404s an unknown story id", async () => {
      prisma.story.findUnique.mockResolvedValue(null);
      await expect(service.view("missing", "u1")).rejects.toThrow(NotFoundException);
      expect(prisma.storyView.create).not.toHaveBeenCalled();
    });

    it("404s an expired story", async () => {
      prisma.story.findUnique.mockResolvedValue({
        id: "s1",
        authorId: "u2",
        expiresAt: new Date(Date.now() - 1000),
      });
      await expect(service.view("s1", "u1")).rejects.toThrow(NotFoundException);
      expect(prisma.storyView.create).not.toHaveBeenCalled();
    });

    it("records a view of your own story", async () => {
      prisma.story.findUnique.mockResolvedValue(liveStory("u1"));
      prisma.storyView.create.mockResolvedValue({});

      await service.view("s1", "u1");

      expect(prisma.storyView.create).toHaveBeenCalledWith({
        data: { storyId: "s1", userId: "u1" },
      });
      expect(prisma.follow.findUnique).not.toHaveBeenCalled();
    });

    it("records a view of a followed author's story", async () => {
      prisma.story.findUnique.mockResolvedValue(liveStory("u2"));
      prisma.follow.findUnique.mockResolvedValue({ followerId: "u1" });
      prisma.storyView.create.mockResolvedValue({});

      await service.view("s1", "u1");

      expect(prisma.follow.findUnique).toHaveBeenCalledWith({
        where: {
          followerId_followingId: { followerId: "u1", followingId: "u2" },
        },
        select: { followerId: true },
      });
      expect(prisma.storyView.create).toHaveBeenCalledWith({
        data: { storyId: "s1", userId: "u1" },
      });
    });

    it("forbids a stranger from viewing a story they were never shown", async () => {
      prisma.story.findUnique.mockResolvedValue(liveStory("u2"));
      prisma.follow.findUnique.mockResolvedValue(null);

      await expect(service.view("s1", "outsider")).rejects.toThrow(ForbiddenException);
      expect(prisma.storyView.create).not.toHaveBeenCalled();
    });
  });
});

describe("ProfilesService", () => {
  let prisma: ReturnType<typeof makePrisma>;
  let service: ProfilesService;

  beforeEach(() => {
    vi.clearAllMocks();
    prisma = makePrisma();
    service = new ProfilesService(prisma as unknown as PrismaService);
  });

  it("returns isFollowing=false for anonymous viewers", async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: "u2",
      name: "Bob",
      username: "bob",
      image: null,
      coverImage: null,
      bio: null,
      createdAt: new Date(),
      _count: { posts: 0, followers: 0, following: 0 },
    });
    const profile = await service.getProfile("u2");
    expect(profile.isFollowing).toBe(false);
    expect(prisma.follow.findUnique).not.toHaveBeenCalled();
  });

  it("reports isFollowing=true when the viewer follows", async () => {
    prisma.user.findUnique.mockResolvedValue({ id: "u2", _count: { posts: 0, followers: 0, following: 0 } });
    prisma.follow.findUnique.mockResolvedValue({ followerId: "u1" });
    const profile = await service.getProfile("u2", "u1");
    expect(profile.isFollowing).toBe(true);
  });

  it("rejects a taken username", async () => {
    prisma.user.findFirst.mockResolvedValue({ id: "someone-else" });
    await expect(service.updateMe("u1", { username: "taken" })).rejects.toThrow(ConflictException);
  });
});

describe("NotificationsService", () => {
  let prisma: ReturnType<typeof makePrisma>;
  let service: NotificationsService;

  beforeEach(() => {
    vi.clearAllMocks();
    prisma = makePrisma();
    service = new NotificationsService(prisma as unknown as PrismaService);
  });

  it("skips self-notifications", async () => {
    await service.notify({ userId: "u1", actorId: "u1", kind: "REACTION" });
    expect(prisma.notification.create).not.toHaveBeenCalled();
  });

  describe("notifyReaction", () => {
    it("creates one notification on the first reaction", async () => {
      prisma.notification.findFirst.mockResolvedValue(null);
      prisma.notification.create.mockResolvedValue({ id: "n1" });

      await service.notifyReaction({
        userId: "u1",
        actorId: "u2",
        entityId: "p1",
        emoji: "👍",
      });

      expect(prisma.notification.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: "u1",
            actorId: "u2",
            kind: "REACTION",
            entityId: "p1",
            message: "👍",
          }),
        })
      );
      expect(prisma.notification.update).not.toHaveBeenCalled();
    });

    it("coalesces a further reaction from the same actor into the unread row", async () => {
      prisma.notification.findFirst.mockResolvedValue({ id: "n1" });
      prisma.notification.update.mockResolvedValue({});

      await service.notifyReaction({
        userId: "u1",
        actorId: "u2",
        entityId: "p1",
        emoji: "❤️",
      });

      expect(prisma.notification.create).not.toHaveBeenCalled();
      expect(prisma.notification.update).toHaveBeenCalledWith({
        where: { id: "n1" },
        data: { message: "❤️" },
      });
    });

    it("keeps separate rows per post even for the same actor", async () => {
      prisma.notification.findFirst.mockResolvedValue(null);
      prisma.notification.create.mockResolvedValue({ id: "n1" });

      await service.notifyReaction({
        userId: "u1",
        actorId: "u2",
        entityId: "p1",
        emoji: "👍",
      });
      await service.notifyReaction({
        userId: "u1",
        actorId: "u2",
        entityId: "p2",
        emoji: "👍",
      });

      expect(prisma.notification.create).toHaveBeenCalledTimes(2);
    });

    it("skips self-reactions", async () => {
      await service.notifyReaction({
        userId: "u1",
        actorId: "u1",
        entityId: "p1",
        emoji: "👍",
      });
      expect(prisma.notification.findFirst).not.toHaveBeenCalled();
      expect(prisma.notification.create).not.toHaveBeenCalled();
    });
  });

  it("marks one or all as read", async () => {
    await service.markRead("u1", "n1");
    expect(prisma.notification.updateMany).toHaveBeenCalledWith({
      where: { userId: "u1", id: "n1" },
      data: { readAt: expect.any(Date) },
    });
    await service.markRead("u1");
    expect(prisma.notification.updateMany).toHaveBeenLastCalledWith({
      where: { userId: "u1", readAt: null },
      data: { readAt: expect.any(Date) },
    });
  });
});

describe("NotificationsService realtime", () => {
  let prisma: ReturnType<typeof makePrisma>;
  let service: NotificationsService;

  beforeEach(() => {
    vi.clearAllMocks();
    prisma = makePrisma();
    service = new NotificationsService(prisma as unknown as PrismaService);
  });

  it("persists a notification and emits NOTIFICATION_CREATED with the record", async () => {
    const record = {
      id: "n1",
      userId: "u2",
      actorId: "u1",
      kind: "REACTION",
      entityId: "p1",
      message: "x",
      readAt: null,
      createdAt: new Date(),
      actor: { id: "u1", name: "Al", username: "al", image: null },
    };
    prisma.notification.create.mockResolvedValue(record);
    const emitSpy = vi.spyOn(notificationEvents, "emit");
    await service.notify({ userId: "u2", actorId: "u1", kind: "REACTION", entityId: "p1", message: "x" });
    expect(prisma.notification.create).toHaveBeenCalledTimes(1);
    expect(emitSpy).toHaveBeenCalledWith(NOTIFICATION_CREATED, record);
    emitSpy.mockRestore();
  });
});
