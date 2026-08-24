import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma } from "@theo/database";
import { PrismaService } from "../prisma/prisma.service";
import { PostsService } from "../social/posts.service";
import { CreatePostDto } from "../social/dto/social.dto";
import { CreateGroupDto, UpdateGroupDto } from "./dto/groups.dto";

const GROUP_LIST_TAKE = 20;
const MEMBER_PREVIEW_TAKE = 24;

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
}

@Injectable()
export class GroupsService {
  constructor(
    private prisma: PrismaService,
    private posts: PostsService
  ) {}

  async create(userId: string, dto: CreateGroupDto): Promise<MappedGroupSummary> {
    const group = await this.prisma.group.create({
      data: {
        name: dto.name.trim(),
        description: dto.description?.trim() || null,
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
    limit = GROUP_LIST_TAKE
  ): Promise<{ items: MappedGroupSummary[]; nextCursor: string | null }> {
    const groups = await this.prisma.group.findMany({
      orderBy: { createdAt: "desc" },
      take: limit + 1,
      ...(cursorId ? { cursor: { id: cursorId }, skip: 1 } : {}),
      include: {
        _count: { select: { members: true, posts: true } },
        ...(viewerId
          ? { members: { where: { userId: viewerId }, select: { userId: true } } }
          : {}),
      },
    });
    const hasMore = groups.length > limit;
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

    return {
      id: group.id,
      name: group.name,
      description: group.description,
      createdAt: group.createdAt,
      creator: group.creator,
      creatorId: group.creatorId,
      memberCount: group._count.members,
      postCount: group._count.posts,
      isMember: Boolean(membership),
      isCreator: group.creatorId === viewerId,
      myRole: membership?.role ?? null,
      members: group.members.map((m) => ({
        userId: m.userId,
        role: m.role,
        joinedAt: m.joinedAt,
        user: m.user,
      })),
    };
  }

  async update(id: string, userId: string, dto: UpdateGroupDto) {
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
      },
    });
    return { id: updated.id, name: updated.name, description: updated.description };
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
      select: { id: true },
    });
    if (!group) throw new NotFoundException("Group not found");

    await this.prisma.groupMember.upsert({
      where: { groupId_userId: { groupId, userId } },
      create: { groupId, userId },
      update: {},
    });

    // Make sure the member is on the group chat thread if it exists.
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
    await this.prisma.groupMember.deleteMany({ where: { groupId, userId } });
    return { joined: false };
  }

  async groupPosts(
    groupId: string,
    viewerId: string | undefined,
    cursorId?: string,
    limit = 10
  ) {
    const exists = await this.prisma.group.findUnique({
      where: { id: groupId },
      select: { id: true },
    });
    if (!exists) throw new NotFoundException("Group not found");
    return this.posts.byGroup(groupId, viewerId, cursorId, limit);
  }

  async createGroupPost(
    groupId: string,
    userId: string,
    dto: CreatePostDto
  ) {
    await this.requireMembership(groupId, userId);
    return this.posts.create(userId, dto, groupId);
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
    }> & { members?: { userId: string }[] },
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
    };
  }
}
