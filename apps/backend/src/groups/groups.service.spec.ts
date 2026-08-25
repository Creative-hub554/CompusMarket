import { Test, TestingModule } from "@nestjs/testing";
import { BadRequestException, ForbiddenException } from "@nestjs/common";
import { GroupsService } from "./groups.service";
import { PrismaService } from "../prisma/prisma.service";
import { PostsService } from "../social/posts.service";
import { NotificationsService } from "../social/notifications.service";

describe("GroupsService", () => {
  let service: GroupsService;

  const mockPrisma = {
    group: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    groupMember: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      upsert: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
    },
    thread: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    threadParticipant: {
      upsert: vi.fn(),
      deleteMany: vi.fn(),
    },
  };

  const mockPosts = {
    create: vi.fn(),
    byGroup: vi.fn(),
  };

  const mockNotifications = {
    notify: vi.fn().mockResolvedValue({}),
  };

  beforeEach(async () => {
    vi.resetAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GroupsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: PostsService, useValue: mockPosts },
        { provide: NotificationsService, useValue: mockNotifications },
      ],
    }).compile();
    service = module.get(GroupsService);
  });

  it("creates a group with the creator as ADMIN member", async () => {
    mockPrisma.group.create.mockResolvedValue({
      id: "g1",
      name: "Cambodia Tech",
      description: null,
      creatorId: "u1",
      createdAt: new Date(),
      _count: { members: 1, posts: 0 },
    });

    const result = await service.create("u1", { name: "Cambodia Tech" });

    expect(mockPrisma.group.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          name: "Cambodia Tech",
          creatorId: "u1",
          members: { create: { userId: "u1", role: "ADMIN" } },
        }),
      })
    );
    expect(result.isCreator).toBe(true);
    expect(result.isMember).toBe(true);
  });

  it("joins a group and syncs the group thread participants", async () => {
    mockPrisma.group.findUnique.mockResolvedValue({ id: "g1" });
    mockPrisma.groupMember.upsert.mockResolvedValue({});
    mockPrisma.thread.findUnique.mockResolvedValue({ id: "t1" });
    mockPrisma.threadParticipant.upsert.mockResolvedValue({});

    const result = await service.join("g1", "u2");

    expect(mockPrisma.threadParticipant.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { threadId_userId: { threadId: "t1", userId: "u2" } },
      })
    );
    expect(result).toEqual({ joined: true });
  });

  it("blocks non-members from posting in a group", async () => {
    mockPrisma.groupMember.findUnique.mockResolvedValue(null);

    await expect(
      service.createGroupPost("g1", "u9", { content: "hello" })
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(mockPosts.create).not.toHaveBeenCalled();
  });

  it("creates group posts through the posts service for members", async () => {
    mockPrisma.groupMember.findUnique.mockResolvedValue({ role: "MEMBER" });
    mockPosts.create.mockResolvedValue({ id: "p1" });
    mockPrisma.group.findUnique.mockResolvedValue({ name: "G" });
    mockPrisma.groupMember.findMany.mockResolvedValue([]);

    await service.createGroupPost("g1", "u1", { content: "hello" });

    expect(mockPosts.create).toHaveBeenCalledWith(
      "u1",
      { content: "hello" },
      "g1"
    );
  });

  it("notifies other members — but not the author — on a group post", async () => {
    mockPrisma.groupMember.findUnique.mockResolvedValue({ role: "MEMBER" });
    mockPosts.create.mockResolvedValue({ id: "p1" });
    mockPrisma.group.findUnique.mockResolvedValue({ name: "Cambodia Tech" });
    mockPrisma.groupMember.findMany.mockResolvedValue([
      { userId: "u1" },
      { userId: "u2" },
      { userId: "u3" },
    ]);

    await service.createGroupPost("g1", "u1", { content: "hello" });

    expect(mockNotifications.notify).toHaveBeenCalledTimes(2);
    expect(mockNotifications.notify).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "u2", kind: "GROUP_POST" })
    );
    expect(mockNotifications.notify).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "u3", kind: "GROUP_POST" })
    );
    expect(mockNotifications.notify).not.toHaveBeenCalledWith(
      expect.objectContaining({ userId: "u1" })
    );
  });

  it("lazily creates the group thread with all members as participants", async () => {
    mockPrisma.groupMember.findUnique.mockResolvedValue({ role: "MEMBER" });
    mockPrisma.thread.findUnique.mockResolvedValue(null);
    mockPrisma.groupMember.findMany.mockResolvedValue([
      { userId: "u1" },
      { userId: "u2" },
    ]);
    mockPrisma.thread.create.mockResolvedValue({ id: "t-new" });

    const result = await service.getOrCreateThread("g1", "u1");

    expect(mockPrisma.thread.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          groupId: "g1",
          participants: { create: [{ userId: "u1" }, { userId: "u2" }] },
        }),
      })
    );
    expect(result).toEqual({ id: "t-new" });
  });

  it("prevents the group creator from leaving", async () => {
    mockPrisma.group.findUnique.mockResolvedValue({ creatorId: "u1" });

    await expect(service.leave("g1", "u1")).rejects.toBeInstanceOf(
      BadRequestException
    );
  });

  it("lets an admin remove a MEMBER and syncs the thread roster", async () => {
    mockPrisma.group.findUnique.mockResolvedValue({ creatorId: "u1" });
    mockPrisma.groupMember.findUnique
      .mockResolvedValueOnce({ role: "ADMIN" })
      .mockResolvedValueOnce({ role: "MEMBER", id: "gm2" });
    mockPrisma.groupMember.delete.mockResolvedValue({});
    mockPrisma.thread.findUnique.mockResolvedValue({ id: "t1" });
    mockPrisma.threadParticipant.deleteMany.mockResolvedValue({ count: 1 });

    const result = await service.removeMember("g1", "u1", "u3");

    expect(mockPrisma.groupMember.delete).toHaveBeenCalledWith({
      where: { groupId_userId: { groupId: "g1", userId: "u3" } },
    });
    expect(mockPrisma.threadParticipant.deleteMany).toHaveBeenCalledWith({
      where: { threadId: "t1", userId: "u3" },
    });
    expect(result).toEqual({ removed: "u3" });
  });

  it("forbids a non-admin from removing members", async () => {
    mockPrisma.group.findUnique.mockResolvedValue({ creatorId: "u1" });
    mockPrisma.groupMember.findUnique
      .mockResolvedValueOnce({ role: "MEMBER" })
      .mockResolvedValueOnce({ role: "MEMBER" });

    await expect(service.removeMember("g1", "u9", "u3")).rejects.toBeInstanceOf(
      ForbiddenException
    );
  });

  it("protects the creator from being removed", async () => {
    mockPrisma.group.findUnique.mockResolvedValue({ creatorId: "u1" });

    await expect(service.removeMember("g1", "u2", "u1")).rejects.toBeInstanceOf(
      BadRequestException
    );
  });

  it("restricts role changes to the creator", async () => {
    mockPrisma.group.findUnique.mockResolvedValue({ creatorId: "u1" });

    await expect(
      service.setMemberRole("g1", "u2", "u3", "ADMIN")
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
