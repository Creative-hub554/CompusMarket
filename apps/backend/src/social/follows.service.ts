import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { NotificationsService } from "./notifications.service";

const USER_CARD_SELECT = { id: true, name: true, username: true, image: true, bio: true };

export type FollowState = "none" | "requested" | "following";

@Injectable()
export class FollowsService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService
  ) {}

  /**
   * Public accounts are followed directly. Private accounts gate access, so
   * following them creates a PENDING request the holder must accept before a
   * Follow edge (and therefore post access) exists. Re-requests reopen a
   * previously DECLINED request.
   */
  async follow(followerId: string, followingId: string): Promise<{ state: FollowState }> {
    if (followerId === followingId) {
      throw new BadRequestException("You cannot follow yourself");
    }
    const target = await this.prisma.user.findUnique({
      where: { id: followingId },
      select: { id: true, accountPrivate: true },
    });
    if (!target) throw new NotFoundException("User not found");

    if (target.accountPrivate) {
      const already = await this.prisma.follow.findUnique({
        where: { followerId_followingId: { followerId, followingId } },
        select: { id: true },
      });
      if (already) return { state: "following" };

      const existing = await this.prisma.followRequest.findUnique({
        where: { followerId_followingId: { followerId, followingId } },
        select: { id: true, status: true },
      });
      if (existing?.status === "PENDING") return { state: "requested" };

      if (existing) {
        // A declined (or stale accepted) request may be reopened.
        await this.prisma.followRequest.update({
          where: { id: existing.id },
          data: { status: "PENDING" },
        });
      } else {
        await this.prisma.followRequest.create({
          data: { followerId, followingId },
        });
      }
      await this.notifications.notify({
        userId: followingId,
        actorId: followerId,
        kind: "FOLLOW_REQUEST",
      });
      return { state: "requested" };
    }

    const created = await this.prisma.follow
      .create({ data: { followerId, followingId } })
      .catch(() => null);
    if (created) {
      await this.notifications.notify({
        userId: followingId,
        actorId: followerId,
        kind: "FOLLOW",
      });
    }
    return { state: "following" };
  }

  /**
   * Removes an accepted follow edge, or — when none exists — cancels the
   * viewer's outstanding follow request on the same pair.
   */
  async unfollow(followerId: string, followingId: string): Promise<{ state: FollowState }> {
    await this.prisma.follow.deleteMany({
      where: { followerId, followingId },
    });
    await this.prisma.followRequest.deleteMany({
      where: { followerId, followingId },
    });
    return { state: "none" };
  }

  async isFollowing(followerId: string, followingId: string): Promise<boolean> {
    const row = await this.prisma.follow.findUnique({
      where: { followerId_followingId: { followerId, followingId } },
      select: { followerId: true },
    });
    return !!row;
  }

  /** Pending requests addressed to the account holder, newest first. */
  pendingFollowRequests(userId: string) {
    return this.prisma.followRequest.findMany({
      where: { followingId: userId, status: "PENDING" },
      orderBy: { createdAt: "desc" },
      include: { follower: { select: USER_CARD_SELECT } },
    });
  }

  /**
   * Accept or decline a follow request. Only the account the request targets
   * may respond. Accepting creates the Follow edge (idempotently) and notifies
   * the requester that their access was granted.
   */
  async respondToFollowRequest(
    ownerId: string,
    requestId: string,
    accept: boolean
  ): Promise<{ accepted: boolean }> {
    const request = await this.prisma.followRequest.findUnique({
      where: { id: requestId },
      select: { id: true, followerId: true, followingId: true, status: true },
    });
    if (!request || request.followingId !== ownerId) {
      throw new NotFoundException("Follow request not found");
    }
    if (request.status !== "PENDING") {
      // Already resolved — treat repeat responses as no-ops.
      return { accepted: accept };
    }

    if (accept) {
      await this.prisma.$transaction([
        this.prisma.followRequest.update({
          where: { id: request.id },
          data: { status: "ACCEPTED" },
        }),
        this.prisma.follow.upsert({
          where: {
            followerId_followingId: {
              followerId: request.followerId,
              followingId: request.followingId,
            },
          },
          create: {
            followerId: request.followerId,
            followingId: request.followingId,
          },
          update: {},
        }),
      ]);
      await this.notifications.notify({
        userId: request.followerId,
        actorId: request.followingId,
        kind: "FOLLOW_ACCEPTED",
      });
    } else {
      await this.prisma.followRequest.update({
        where: { id: request.id },
        data: { status: "DECLINED" },
      });
    }
    return { accepted: accept };
  }

  followers(userId: string) {
    return this.prisma.follow.findMany({
      where: { followingId: userId },
      orderBy: { createdAt: "desc" },
      take: 100,
      include: { follower: { select: USER_CARD_SELECT } },
    });
  }

  following(userId: string) {
    return this.prisma.follow.findMany({
      where: { followerId: userId },
      orderBy: { createdAt: "desc" },
      take: 100,
      include: { following: { select: USER_CARD_SELECT } },
    });
  }

  async suggestions(userId: string, limit = 5) {
    const followed = await this.prisma.follow.findMany({
      where: { followerId: userId },
      select: { followingId: true },
    });
    const exclude = [userId, ...followed.map((f) => f.followingId)];

    const popular = await this.prisma.follow.groupBy({
      by: ["followingId"],
      where: { followingId: { notIn: exclude } },
      _count: { followingId: true },
      orderBy: { _count: { followingId: "desc" } },
      take: limit,
    });

    let ids = popular.map((p) => p.followingId);
    if (ids.length < limit) {
      const newest = await this.prisma.user.findMany({
        where: { id: { notIn: [...exclude, ...ids] } },
        orderBy: { createdAt: "desc" },
        take: limit - ids.length,
        select: { id: true },
      });
      ids = [...ids, ...newest.map((u) => u.id)];
    }

    const users = await this.prisma.user.findMany({
      where: { id: { in: ids } },
      select: {
        ...USER_CARD_SELECT,
        _count: { select: { followers: true } },
      },
    });
    return users.sort((a, b) => b._count.followers - a._count.followers);
  }
}
