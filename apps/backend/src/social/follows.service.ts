import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { NotificationsService } from "./notifications.service";

const USER_CARD_SELECT = { id: true, name: true, username: true, image: true, bio: true };

@Injectable()
export class FollowsService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService
  ) {}

  async follow(followerId: string, followingId: string): Promise<void> {
    if (followerId === followingId) {
      throw new BadRequestException("You cannot follow yourself");
    }
    const target = await this.prisma.user.findUnique({
      where: { id: followingId },
      select: { id: true },
    });
    if (!target) throw new NotFoundException("User not found");

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
  }

  async unfollow(followerId: string, followingId: string): Promise<void> {
    await this.prisma.follow.deleteMany({
      where: { followerId, followingId },
    });
  }

  async isFollowing(followerId: string, followingId: string): Promise<boolean> {
    const row = await this.prisma.follow.findUnique({
      where: { followerId_followingId: { followerId, followingId } },
      select: { followerId: true },
    });
    return !!row;
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
