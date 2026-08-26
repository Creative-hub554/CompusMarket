import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma } from "@theo/database";
import { PrismaService } from "../prisma/prisma.service";
import { PostsService } from "../social/posts.service";
import { NotificationsService } from "../social/notifications.service";
import { CreatePostDto } from "../social/dto/social.dto";
import { CreateGroupDto, UpdateGroupDto } from "./dto/groups.dto";

const GROUP_LIST_TAKE = 20;
const MEMBER_PREVIEW_TAKE = 24;
const SEARCH_SCAN_LIMIT = 200;

function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, "\\$&");
}

export interface MappedGroupSummary {
  id: string;
  name: string;
  description: string | null;
  creatorId: string;
  createdAt: Date;
  memberCount: number;
  postCount: number;
  isMember: boolean;
  isCreator: boolean;
  privacy: "PUBLIC" | "PRIVATE";
  hasPendingRequest?: boolean;
}

@Injectable()
export class GroupsService {
  constructor(
    private prisma: PrismaService,
    private posts: PostsService,
    private notifications: NotificationsService
  ) {}

  async create(userId: string, dto: CreateGroupDto): Promise<MappedGroupSummary> {
    const group = await this.prisma.group.create({
      data: {
        name: dto.name.trim(),
        description: dto.description?.trim() || null,
        privacy: dto.privacy === "PRIVATE" ? "PRIVATE" : "PUBLIC",
        creatorId: userId,
        members: { create: { userId, role: "ADMIN" } },
      },
      include: { _count: { select: { members: true, posts: true } } },
    });
    // The creator is always the first ADMIN member; the create include does
    // not fetch the members rows, so set membership explicitly.
    return { ...this.mapSummary(group, userId), isMember: true };
  }

  async list(
    viewerId?: string,
    cursorId?: string,
    limit = GROUP_LIST_TAKE,
    query?: string
  ): Promise<{ items: MappedGroupSummary[]; nextCursor: string | null }> {
    let where: Prisma.GroupWhereInput = {};
    if (query) {
      const matched = await this.prisma.$queryRaw<{ id: string }[]>`
        SELECT "id" FROM "Group"
        WHERE lower("name") LIKE lower(${`%${escapeLike(query)}%`}) ESCAPE '\'
        ORDER BY "createdAt" DESC
        LIMIT ${SEARCH_SCAN_LIMIT}`;
      where = { id: { in: matched.map((r) => r.id) } };
    }

    const groups = await this.prisma.group.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: query ? limit : limit + 1,
      ...(cursorId && !query ? { cursor: { id: cursorId }, skip: 1 } : {}),
      include: {
        _count: { select: { members: true, posts: true } },
        ...(viewerId
          ? {
              members: { where: { userId: viewerId }, select: { userId: true } },
              requests: {
                where: { userId: viewerId, status: "PENDING" },
                select: { id: true },
              },
            }
          : {}),
      },
    });
    const hasMore = !query && groups.length > limit;
    const items = groups.slice(0, limit).map((g) => this.mapSummary(g, viewerId));
    return { items, nextCursor: hasMore ? items[items.length - 1].id : null };
  }

  async findOne(id: string, viewerId?: string) {
    const group = await this.prisma.group.findUnique({
      where: { id },
      include: {
        creator: { select: { id: true, name: true, username: true, image: true } },
        members: {
          orderBy: { joinedAt: "asc" },
          take: MEMBER_PREVIEW_TAKE,
          include: { user: { select: { id: true, name: true, username: true, image: true } } },
        },
        _count: { select: { members: true, posts: true } },
      },
    });
    if (!group) throw new NotFoundException("Group not found");

    const membership = viewerId
      ? await this.prisma.groupMember.findUnique({
          where: { groupId_userId: { groupId: id, userId: viewerId } },
          select: { role: true },
        })
      : null;

    const pendingRequest =
      viewerId && !membership
        ? await this.prisma.groupJoinRequest.findFirst({
            where: { groupId: id, userId: viewerId, status: "PENDING" },
            select: { id: true },
          })
        : null;

    const isMember = Boolean(membership);
    const isPrivate = group.privacy === "PRIVATE";

    return {
      id: group.id,
      name: group.name,
      description: group.description,
      coverUrl: group.coverUrl,
      privacy: group.privacy,
      createdAt: group.createdAt,
      creator: group.creator,
      creatorId: group.creatorId,
      memberCount: group._count.members,
      postCount: group._count.posts,
      isMember,
      isCreator: group.creatorId === viewerId,
      myRole: membership?.role ?? null,
      hasPendingRequest: Boolean(pendingRequest),
      // Private groups only expose the roster to their own members.
      members:
        isPrivate && !isMember
          ? []
          : group.members.map((m) => ({
              userId: m.userId,
              role: m.role,
              joinedAt: m.joinedAt,
              user: m.user,
            })),
    };
  }

  async update(id: string, userId: string, dto: UpdateGroupDto & { coverUrl?: string }) {
    const membership = await this.requireMembership(id, userId);
    if (membership.role !== "ADMIN") {
      throw new ForbiddenException("Only group admins can edit the group");
    }
    const updated = await this.prisma.group.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.description !== undefined
          ? { description: dto.description.trim() || null }
          : {}),
        ...(dto.coverUrl !== undefined
          ? { coverUrl: dto.coverUrl.trim() || null }
          : {}),
      },
    });
    return {
      id: updated.id,
      name: updated.name,
      description: updated.description,
      coverUrl: updated.coverUrl,
    };
  }

  /**
   * Remove a member. Admins can remove MEMBERs; only the creator can remove
   * another ADMIN. The creator cannot be removed.
   */
  async removeMember(groupId: string, requesterId: string, targetUserId: string) {
    const group = await this.prisma.group.findUnique({
      where: { id: groupId },
      select: { creatorId: true },
    });
    if (!group) throw new NotFoundException("Group not found");
    if (targetUserId === group.creatorId) {
      throw new BadRequestException("The group creator cannot be removed");
    }

    const requester = await this.requireMembership(groupId, requesterId);
    const target = await this.requireMembership(groupId, targetUserId);
    if (requester.role !== "ADMIN") {
      throw new ForbiddenException("Only group admins can remove members");
    }
    if (target.role === "ADMIN" && requesterId !== group.creatorId) {
      throw new ForbiddenException("Only the group creator can remove an admin");
    }

    await this.prisma.groupMember.delete({
      where: { groupId_userId: { groupId, userId: targetUserId } },
    });

    // Keep the group chat roster in sync.
    const thread = await this.prisma.thread.findUnique({
      where: { groupId },
      select: { id: true },
    });
    if (thread) {
      await this.prisma.threadParticipant.deleteMany({
        where: { threadId: thread.id, userId: targetUserId },
      });
    }
    return { removed: targetUserId };
  }

  /** Promote/demote between ADMIN and MEMBER. Creator-only. */
  async setMemberRole(
    groupId: string,
    requesterId: string,
    targetUserId: string,
    role: "ADMIN" | "MEMBER"
  ) {
    const group = await this.prisma.group.findUnique({
      where: { id: groupId },
      select: { creatorId: true },
    });
    if (!group) throw new NotFoundException("Group not found");
    if (requesterId !== group.creatorId) {
      throw new ForbiddenException("Only the group creator can change roles");
    }
    if (targetUserId === group.creatorId) {
      throw new BadRequestException("The creator is always an admin");
    }
    const membership = await this.requireMembership(groupId, targetUserId);
    const updated = await this.prisma.groupMember.update({
      where: { id: membership.id },
      data: { role },
      include: { user: { select: { id: true, name: true, username: true, image: true } } },
    });
    return { userId: updated.userId, role: updated.role };
  }

  async remove(id: string, userId: string, role?: string): Promise<void> {
    const group = await this.prisma.group.findUnique({
      where: { id },
      select: { creatorId: true },
    });
    if (!group) throw new NotFoundException("Group not found");
    if (group.creatorId !== userId && role !== "ADMIN") {
      throw new ForbiddenException("Only the group creator can delete the group");
    }
    await this.prisma.group.delete({ where: { id } });
  }

  async join(groupId: string, userId: string) {
    const group = await this.prisma.group.findUnique({
      where: { id: groupId },
      select: { id: true, privacy: true },
    });
    if (!group) throw new NotFoundException("Group not found");

    // Private groups require an admin-approved join request.
    if (group.privacy === "PRIVATE") {
      const existing = await this.prisma.groupJoinRequest.findUnique({
        where: { groupId_userId: { groupId, userId } },
      });
      if (existing?.status === "PENDING") {
        return { requested: true };
      }
      if (existing?.status === "DECLINED") {
        // Declined users may ask again — reopen the request.
        await this.prisma.groupJoinRequest.update({
          where: { id: existing.id },
          data: { status: "PENDING" },
        });
      } else {
        await this.prisma.groupJoinRequest.create({
          data: { groupId, userId },
        });
        // Notify every group admin so someone can approve.
        const admins = await this.prisma.groupMember.findMany({
          where: { groupId, role: "ADMIN" },
          select: { userId: true },
        });
        await Promise.all(
          admins.map((a) =>
            this.notifications.notify({
              userId: a.userId,
              actorId: userId,
              kind: "JOIN_REQUEST",
              entityId: groupId,
              message: group.id,
            })
          )
        );
      }
      return { requested: true };
    }

    await this.prisma.groupMember.upsert({
      where: { groupId_userId: { groupId, userId } },
      create: { groupId, userId },
      update: {},
    });

    // Make sure the member is on the group chat thread if it exists.
    await this.syncThreadMembership(groupId, userId);
    return { joined: true };
  }

  async leave(groupId: string, userId: string) {
    const group = await this.prisma.group.findUnique({
      where: { id: groupId },
      select: { creatorId: true },
    });
    if (!group) throw new NotFoundException("Group not found");
    if (group.creatorId === userId) {
      throw new BadRequestException(
        "The group creator cannot leave — delete the group instead"
      );
    }
    const deleted = await this.prisma.groupMember.deleteMany({
      where: { groupId, userId },
    });
    if (deleted.count === 0) {
      // No membership — maybe they had a pending request: cancel it.
      await this.prisma.groupJoinRequest.deleteMany({
        where: { groupId, userId, status: "PENDING" },
      });
      return { joined: false, cancelled: true };
    }
    return { joined: false };
  }

  /** Pending join requests with requester info. Admin-only (enforced in controller via service). */
  async listJoinRequests(groupId: string, requesterId: string) {
    await this.requireRole(groupId, requesterId, "ADMIN");
    return this.prisma.groupJoinRequest.findMany({
      where: { groupId, status: "PENDING" },
      orderBy: { createdAt: "asc" },
      include: {
        user: { select: { id: true, name: true, username: true, image: true } },
      },
    });
  }

  async respondToJoinRequest(
    groupId: string,
    responderId: string,
    requestUserId: string,
    accept: boolean
  ) {
    await this.requireRole(groupId, responderId, "ADMIN");

    const request = await this.prisma.groupJoinRequest.findUnique({
      where: { groupId_userId: { groupId, userId: requestUserId } },
    });
    if (!request || request.status !== "PENDING") {
      throw new NotFoundException("No pending request from that user");
    }

    if (accept) {
      const thread = await this.prisma.thread.findUnique({
        where: { groupId },
        select: { id: true },
      });
      await Promise.all([
        this.prisma.groupJoinRequest.update({
          where: { id: request.id },
          data: { status: "ACCEPTED" },
        }),
        this.prisma.groupMember.upsert({
          where: { groupId_userId: { groupId, userId: requestUserId } },
          create: { groupId, userId: requestUserId },
          update: {},
        }),
        ...(thread
          ? [
              this.prisma.threadParticipant.upsert({
                where: {
                  threadId_userId: { threadId: thread.id, userId: requestUserId },
                },
                create: { threadId: thread.id, userId: requestUserId },
                update: {},
              }),
            ]
          : []),
      ]);
    } else {
      await this.prisma.groupJoinRequest.update({
        where: { id: request.id },
        data: { status: "DECLINED" },
      });
    }
    return { accepted: accept };
  }

  private async syncThreadMembership(groupId: string, userId: string) {
    const thread = await this.prisma.thread.findUnique({
      where: { groupId },
      select: { id: true },
    });
    if (thread) {
      await this.prisma.threadParticipant.upsert({
        where: { threadId_userId: { threadId: thread.id, userId } },
        create: { threadId: thread.id, userId },
        update: {},
      });
    }
  }

  private async requireRole(
    groupId: string,
    userId: string,
    role: "ADMIN"
  ) {
    const membership = await this.requireMembership(groupId, userId);
    if (membership.role !== role) {
      throw new ForbiddenException(`Only group admins can do that`);
    }
    return membership;
  }

  async groupPosts(
    groupId: string,
    viewerId: string | undefined,
    cursorId?: string,
    limit = 10
  ) {
    const group = await this.prisma.group.findUnique({
      where: { id: groupId },
      select: { id: true, privacy: true },
    });
    if (!group) throw new NotFoundException("Group not found");
    if (group.privacy === "PRIVATE") {
      if (!viewerId) throw new ForbiddenException("This group is private");
      await this.requireMembership(groupId, viewerId);
    }
    return this.posts.byGroup(groupId, viewerId, cursorId, limit);
  }

  /** Admin-only pin/unpin. Pinned posts sort first in the group feed. */
  async setPostPinned(
    groupId: string,
    postId: string,
    userId: string,
    pinned: boolean
  ) {
    await this.requireRole(groupId, userId, "ADMIN");
    const post = await this.prisma.post.findFirst({
      where: { id: postId, groupId },
      select: { id: true },
    });
    if (!post) throw new NotFoundException("Post not found in this group");
    await this.prisma.post.update({
      where: { id: postId },
      data: { pinnedAt: pinned ? new Date() : null },
    });
    return { pinned };
  }

  async createGroupPost(
    groupId: string,
    userId: string,
    dto: CreatePostDto
  ) {
    await this.requireMembership(groupId, userId);
    const post = await this.posts.create(userId, dto, groupId);

    // Fan out a GROUP_POST notification to every other member.
    const [group, members] = await Promise.all([
      this.prisma.group.findUnique({
        where: { id: groupId },
        select: { name: true },
      }),
      this.prisma.groupMember.findMany({
        where: { groupId, userId: { not: userId } },
        select: { userId: true },
      }),
    ]);
    const recipients = members.filter((m) => m.userId !== userId);
    if (group) {
      await Promise.all(
        recipients.map((m) =>
          this.notifications.notify({
            userId: m.userId,
            actorId: userId,
            kind: "GROUP_POST",
            entityId: groupId,
            message: group.name,
          })
        )
      );
    }

    return post;
  }

  /**
   * Group chat: one thread per group whose participants mirror the membership.
   * Created lazily on first open, then kept in sync on join.
   */
  async getOrCreateThread(groupId: string, userId: string) {
    await this.requireMembership(groupId, userId);

    const existing = await this.prisma.thread.findUnique({
      where: { groupId },
      select: { id: true },
    });
    if (existing) return { id: existing.id };

    const members = await this.prisma.groupMember.findMany({
      where: { groupId },
      select: { userId: true },
    });

    const thread = await this.prisma.thread.create({
      data: {
        groupId,
        participants: { create: members.map((m) => ({ userId: m.userId })) },
      },
      select: { id: true },
    });
    return { id: thread.id };
  }

  async requireMembership(groupId: string, userId: string) {
    const membership = await this.prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId } },
    });
    if (!membership) {
      throw new ForbiddenException("You must be a group member to do that");
    }
    return membership;
  }

  private mapSummary(
    group: Prisma.GroupGetPayload<{
      include: { _count: { select: { members: true; posts: true } } };
    }> & {
      members?: { userId: string }[];
      requests?: { id: string }[];
    },
    viewerId?: string
  ): MappedGroupSummary {
    const membership = group.members?.[0];
    return {
      id: group.id,
      name: group.name,
      description: group.description,
      creatorId: group.creatorId,
      createdAt: group.createdAt,
      memberCount: group._count.members,
      postCount: group._count.posts,
      isMember: membership ? membership.userId === viewerId : false,
      isCreator: group.creatorId === viewerId,
      privacy: (group as { privacy?: "PUBLIC" | "PRIVATE" }).privacy ?? "PUBLIC",
      hasPendingRequest: group.requests ? group.requests.length > 0 : undefined,
    };
  }
}
