import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { PostsService, MappedPost } from "../social/posts.service";
import { NotificationsService } from "../social/notifications.service";
import { CreatePostDto } from "../social/dto/social.dto";
import { CreatePageDto, UpdatePageDto } from "./dto/pages.dto";

const PAGE_LIST_TAKE = 20;
const FOLLOWER_TAKE = 20;
const SHOP_TAKE = 20;
const INSIGHT_DAYS = 7;
/** Credits charged per boost. Env-overridable; 0 = free beta. */
const BOOST_COST_CREDITS = Number(process.env.BOOST_COST_CREDITS ?? 0);
const BOOST_HOURS = 24;

export interface MappedPage {
  id: string;
  name: string;
  username: string;
  category: string;
  description: string | null;
  image: string | null;
  coverImage: string | null;
  phone: string | null;
  createdAt: Date;
  followerCount: number;
  postCount: number;
  verified: boolean;
  isFollowing: boolean;
  viewerRole: "OWNER" | "EDITOR" | null;
}

export interface PageInsights {
  followers: number;
  newFollowers: number;
  impressions: number;
  reactions: number;
  comments: number;
  topPosts: {
    id: string;
    content: string;
    reactions: number;
    comments: number;
    impressions: number;
    engagementRate: number;
    rank: number;
    createdAt: string;
  }[];
  /** Daily follower counts for the last N days [{date, count}] */
  followerGrowth: { date: string; count: number }[];
  /** Daily engagement metrics [{date, impressions, reactions, comments}] */
  engagementOverTime: {
    date: string;
    impressions: number;
    reactions: number;
    comments: number;
    posts: number;
  }[];
  /** Posts created per week in the last 8 weeks */
  postFrequency: { week: string; count: number }[];
  /** Total engagement score = reactions + comments*2 */
  engagementScore: number;
  /** Average engagement rate across all posts */
  avgEngagementRate: number;
}

@Injectable()
export class PagesService {
  constructor(
    private prisma: PrismaService,
    private posts: PostsService,
    private notifications: NotificationsService
  ) {}

  async create(userId: string, dto: CreatePageDto): Promise<MappedPage> {
    const username = dto.username.trim();
    await this.assertUsernameFree(username);

    const page = await this.prisma.page.create({
      data: {
        name: dto.name.trim(),
        username,
        category: dto.category.trim(),
        description: dto.description?.trim() || null,
        image: dto.image || null,
        coverImage: dto.coverImage || null,
        phone: dto.phone?.trim() || null,
        ownerId: userId,
        members: { create: { userId, role: "OWNER" } },
      },
    });
    return this.mapPage(page, userId, {
      followerCount: 0,
      postCount: 0,
      verified: await this.isVerified(page.ownerId),
      isFollowing: false,
      viewerRole: "OWNER",
    });
  }

  /** Usernames are shared across users and pages. */
  private async assertUsernameFree(username: string): Promise<void> {
    const clash = await this.prisma.$transaction([
      this.prisma.user.findFirst({ where: { username }, select: { id: true } }),
      this.prisma.page.findFirst({ where: { username }, select: { id: true } }),
    ]);
    if (clash[0] || clash[1]) {
      throw new ConflictException("Username already taken");
    }
  }

  async list(
    viewerId: string | undefined,
    cursorId?: string,
    limit = PAGE_LIST_TAKE,
    category?: string,
    query?: string
  ): Promise<{ items: MappedPage[]; nextCursor: string | null }> {
    const pages = await this.prisma.page.findMany({
      where: {
        ...(category ? { category: { equals: category, } } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: query ? 200 : limit + 1,
      ...(cursorId && !query ? { cursor: { id: cursorId }, skip: 1 } : {}),
      include: {
        _count: { select: { followers: true, posts: true } },
        owner: {
          select: { sellerProfile: { select: { verificationStatus: true } } },
        },
        ...(viewerId
          ? { followers: { where: { userId: viewerId }, select: { userId: true } } }
          : {}),
      },
    });
    // SQLite has no case-insensitive contains — filter in JS like groups.list.
    const filtered = query
      ? pages.filter(
          (p) =>
            p.name.toLowerCase().includes(query.toLowerCase()) ||
            p.category.toLowerCase().includes(query.toLowerCase()) ||
            p.username.toLowerCase().includes(query.toLowerCase())
        )
      : pages;
    const hasMore = !query && filtered.length > limit;
    const items = filtered.slice(0, limit).map((p) =>
      this.mapPage(p, viewerId, {
        followerCount: p._count.followers,
        postCount: p._count.posts,
        verified: p.owner.sellerProfile?.verificationStatus === "APPROVED",
        isFollowing: viewerId ? p.followers.length > 0 : false,
        viewerRole: null,
      })
    );
    return { items, nextCursor: hasMore ? items[items.length - 1].id : null };
  }

  async findOne(idOrUsername: string, viewerId?: string, byUsername = false): Promise<MappedPage> {
    const page = byUsername
      ? await this.prisma.page.findUnique({ where: { username: idOrUsername } })
      : await this.prisma.page.findUnique({ where: { id: idOrUsername } });
    if (!page) throw new NotFoundException("Page not found");

    const [counts, membership, isFollowing, verified] = await Promise.all([
      this.prisma.page.findUnique({
        where: { id: page.id },
        select: { _count: { select: { followers: true, posts: true } } },
      }),
      viewerId
        ? this.prisma.pageMember.findUnique({
            where: { pageId_userId: { pageId: page.id, userId: viewerId } },
            select: { role: true },
          })
        : Promise.resolve(null),
      viewerId
        ? this.prisma.pageFollow.findUnique({
            where: { pageId_userId: { pageId: page.id, userId: viewerId } },
            select: { userId: true },
          }).then((r) => !!r)
        : Promise.resolve(false),
      this.isVerified(page.ownerId),
    ]);

    return this.mapPage(page, viewerId, {
      followerCount: counts?._count.followers ?? 0,
      postCount: counts?._count.posts ?? 0,
      verified,
      isFollowing,
      viewerRole: (membership?.role as "OWNER" | "EDITOR" | undefined) ?? null,
    });
  }

  async update(id: string, userId: string, dto: UpdatePageDto): Promise<Partial<MappedPage>> {
    await this.requireRole(id, userId, "EDITOR");
    const updated = await this.prisma.page.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.category !== undefined ? { category: dto.category.trim() } : {}),
        ...(dto.description !== undefined ? { description: dto.description.trim() || null } : {}),
        ...(dto.image !== undefined ? { image: dto.image || null } : {}),
        ...(dto.coverImage !== undefined ? { coverImage: dto.coverImage || null } : {}),
        ...(dto.phone !== undefined ? { phone: dto.phone.trim() || null } : {}),
      },
    });
    return {
      id: updated.id,
      name: updated.name,
      category: updated.category,
      description: updated.description,
      image: updated.image,
      coverImage: updated.coverImage,
      phone: updated.phone,
    };
  }

  async remove(id: string, userId: string, role?: string): Promise<void> {
    const page = await this.prisma.page.findUnique({
      where: { id },
      select: { ownerId: true },
    });
    if (!page) throw new NotFoundException("Page not found");
    if (page.ownerId !== userId && role !== "ADMIN") {
      throw new ForbiddenException("Only the page owner can delete the page");
    }
    await this.prisma.page.delete({ where: { id } });
  }

  // ── Members ──

  async listMembers(id: string) {
    return this.prisma.pageMember.findMany({
      where: { pageId: id },
      orderBy: { role: "asc" },
      include: { user: { select: { id: true, name: true, username: true, image: true } } },
    });
  }

  async addMember(pageId: string, requesterId: string, targetUserId: string, role: "OWNER" | "EDITOR") {
    await this.requireRole(pageId, requesterId, "OWNER");
    const target = await this.prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true },
    });
    if (!target) throw new NotFoundException("User not found");
    const member = await this.prisma.pageMember.upsert({
      where: { pageId_userId: { pageId, userId: targetUserId } },
      create: { pageId, userId: targetUserId, role },
      update: { role },
      include: { user: { select: { id: true, name: true, username: true, image: true } } },
    });
    return member;
  }

  async removeMember(pageId: string, requesterId: string, targetUserId: string) {
    const page = await this.prisma.page.findUnique({
      where: { id: pageId },
      select: { ownerId: true },
    });
    if (!page) throw new NotFoundException("Page not found");
    if (targetUserId === page.ownerId) {
      throw new BadRequestException("The page owner cannot be removed");
    }
    await this.requireRole(pageId, requesterId, "OWNER");
    await this.prisma.pageMember.delete({
      where: { pageId_userId: { pageId, userId: targetUserId } },
    });
    return { removed: targetUserId };
  }

  // ── Follows ──

  async follow(pageId: string, userId: string) {
    const page = await this.prisma.page.findUnique({
      where: { id: pageId },
      select: { id: true, ownerId: true },
    });
    if (!page) throw new NotFoundException("Page not found");

    const created = await this.prisma.pageFollow
      .create({ data: { pageId, userId } })
      .catch((e: unknown) => {
        if ((e as { code?: string }).code === "P2002") {
          return null; // already following
        }
        throw e;
      });
    if (created) {
      await this.notifications.notify({
        userId: page.ownerId,
        actorId: userId,
        kind: "PAGE_FOLLOW",
        entityId: pageId,
      });
    }
    const count = await this.prisma.pageFollow.count({ where: { pageId } });
    return { following: Boolean(created), followerCount: count };
  }

  async unfollow(pageId: string, userId: string) {
    await this.prisma.pageFollow.deleteMany({
      where: { pageId, userId },
    });
    const count = await this.prisma.pageFollow.count({ where: { pageId } });
    return { following: false, followerCount: count };
  }

  /** Cursor-paginated follower cards, newest first. */
  async followers(pageId: string, cursorId?: string, limit = FOLLOWER_TAKE) {
    const rows = await this.prisma.pageFollow.findMany({
      where: { pageId },
      orderBy: { createdAt: "desc" },
      take: limit + 1,
      ...(cursorId ? { cursor: { id: cursorId }, skip: 1 } : {}),
      include: { user: { select: { id: true, name: true, username: true, image: true } } },
    });
    const hasMore = rows.length > limit;
    const items = rows.slice(0, limit).map((r) => ({ user: r.user, followedAt: r.createdAt }));
    return { items, nextCursor: hasMore ? rows[limit - 1].id : null };
  }

  /** Page profile feed: pinned first, then newest. */
  async pagePosts(
    pageId: string,
    viewerId: string | undefined,
    cursorId?: string,
    limit = 10
  ): Promise<{ items: MappedPost[]; nextCursor: string | null }> {
    const page = await this.prisma.page.findUnique({
      where: { id: pageId },
      select: { id: true },
    });
    if (!page) throw new NotFoundException("Page not found");
    return this.posts.byPage(pageId, viewerId, cursorId, limit);
  }

  /** Post as the page. Requires OWNER or EDITOR membership. */
  async createPagePost(pageId: string, userId: string, dto: CreatePostDto) {
    await this.requireRole(pageId, userId, "EDITOR");
    return this.posts.create(userId, dto, undefined, pageId);
  }

  async setPostPinned(pageId: string, postId: string, userId: string, pinned: boolean) {
    await this.requireRole(pageId, userId, "EDITOR");
    const post = await this.prisma.post.findFirst({
      where: { id: postId, pageId },
      select: { id: true },
    });
    if (!post) throw new NotFoundException("Post not found on this page");
    await this.prisma.post.update({
      where: { id: postId },
      data: { pinnedAt: pinned ? new Date() : null },
    });
    return { pinned };
  }

  // ── Messaging (Phase 2) ──

  /**
   * Customer opens a chat with a page: one thread per (page, customer),
   * participant = the customer. Staff get access via their page membership.
   */
  async getOrCreateThread(pageId: string, userId: string) {
    const page = await this.prisma.page.findUnique({
      where: { id: pageId },
      select: { id: true, ownerId: true },
    });
    if (!page) throw new NotFoundException("Page not found");
    if (page.ownerId === userId) {
      throw new BadRequestException("You cannot message your own page");
    }

    const existing = await this.prisma.thread.findUnique({
      where: { pageId },
      select: { id: true },
    });
    if (existing) {
      await this.prisma.threadParticipant.upsert({
        where: { threadId_userId: { threadId: existing.id, userId } },
        create: { threadId: existing.id, userId },
        update: {},
      });
      return { id: existing.id };
    }

    try {
      const thread = await this.prisma.thread.create({
        data: {
          pageId,
          participants: { create: [{ userId }] },
        },
        select: { id: true },
      });
      return { id: thread.id };
    } catch (e) {
      // Concurrent opens race on @unique(pageId); return the winner's thread.
      if ((e as { code?: string }).code === "P2002") {
        const created = await this.prisma.thread.findUnique({
          where: { pageId },
          select: { id: true },
        });
        if (created) {
          await this.prisma.threadParticipant.upsert({
            where: { threadId_userId: { threadId: created.id, userId } },
            create: { threadId: created.id, userId },
            update: {},
          });
          return { id: created.id };
        }
      }
      throw e;
    }
  }

  // ── Shop (Phase 3) ──

  /** Active products of the owner's verified seller shop — the page's Shop tab. */
  async pageProducts(pageId: string) {
    const page = await this.prisma.page.findUnique({
      where: { id: pageId },
      select: {
        id: true,
        owner: {
          select: {
            id: true,
            sellerProfile: {
              select: { id: true, verificationStatus: true },
            },
          },
        },
      },
    });
    if (!page) throw new NotFoundException("Page not found");
    if (page.owner.sellerProfile?.verificationStatus !== "APPROVED") {
      return { items: [], verified: false };
    }
    const products = await this.prisma.product.findMany({
      where: {
        seller: { id: page.owner.sellerProfile.id },
        status: "ACTIVE",
      },
      orderBy: { createdAt: "desc" },
      take: SHOP_TAKE,
      select: {
        id: true,
        name: true,
        description: true,
        price: true,
        condition: true,
        images: true,
        stock: true,
        createdAt: true,
      },
    });
    return { items: products, verified: true };
  }

  // ── Insights (Phase 4) ──

  async insights(pageId: string, userId: string): Promise<PageInsights> {
    await this.requireRole(pageId, userId, "EDITOR");
    const since = new Date(Date.now() - INSIGHT_DAYS * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const eightWeeksAgo = new Date(Date.now() - 56 * 24 * 60 * 60 * 1000);

    const [
      followers,
      newFollowers,
      agg,
      allPosts,
      reactionSum,
      commentSum,
      followerHistory,
      recentPosts,
      postsByWeek,
    ] = await Promise.all([
      this.prisma.pageFollow.count({ where: { pageId } }),
      this.prisma.pageFollow.count({ where: { pageId, createdAt: { gte: since } } }),
      this.prisma.post.aggregate({
        where: { pageId },
        _sum: { impressions: true },
        _count: true,
      }),
      this.prisma.post.findMany({
        where: { pageId },
        orderBy: [{ boostedUntil: { sort: "desc", nulls: "last" } }, { createdAt: "desc" }],
        take: 50,
        select: {
          id: true,
          content: true,
          impressions: true,
          createdAt: true,
          _count: { select: { reactions: true, comments: true } },
        },
      }),
      this.prisma.reaction.count({ where: { post: { pageId } } }),
      this.prisma.comment.count({ where: { post: { pageId } } }),
      // Follower growth: individual follow records for the last 30 days
      this.prisma.pageFollow.findMany({
        where: { pageId, createdAt: { gte: thirtyDaysAgo } },
        select: { createdAt: true },
        orderBy: { createdAt: "asc" },
      }),
      // Post-level data for engagement over time
      this.prisma.post.findMany({
        where: { pageId, createdAt: { gte: thirtyDaysAgo } },
        select: {
          id: true,
          createdAt: true,
          impressions: true,
          _count: { select: { reactions: true, comments: true } },
        },
        orderBy: { createdAt: "asc" },
      }),
      // Posts grouped by week for frequency chart
      this.prisma.post.findMany({
        where: { pageId, createdAt: { gte: eightWeeksAgo } },
        select: { createdAt: true },
        orderBy: { createdAt: "asc" },
      }),
    ]);

    // ── Top posts ranking ──
    const ranked = [...allPosts]
      .map((p) => ({
        id: p.id,
        content: p.content,
        reactions: p._count.reactions,
        comments: p._count.comments,
        impressions: p.impressions,
        createdAt: p.createdAt.toISOString(),
        engagement: p._count.reactions + p._count.comments * 2,
      }))
      .sort((a, b) => b.engagement - a.engagement)
      .slice(0, 10)
      .map((p, i) => ({
        id: p.id,
        content: p.content,
        reactions: p.reactions,
        comments: p.comments,
        impressions: p.impressions,
        engagementRate: p.impressions > 0
          ? Math.round(((p.reactions + p.comments) / p.impressions) * 10000) / 100
          : 0,
        rank: i + 1,
        createdAt: p.createdAt,
      }));

    // ── Follower growth (daily buckets for last 30 days) ──
    const followerGrowth = this.buildDailyTimeline(
      followerHistory.map((f) => f.createdAt),
      thirtyDaysAgo,
      30,
    );

    // ── Engagement over time (daily buckets) ──
    const engagementOverTime = this.buildEngagementTimeline(recentPosts, thirtyDaysAgo, 30);

    // ── Post frequency (weekly buckets for last 8 weeks) ──
    const postFrequency = this.buildWeeklyTimeline(postsByWeek.map((p) => p.createdAt), eightWeeksAgo, 8);

    // ── Aggregate scores ──
    const totalPosts = agg._count;
    const engagementScore = reactionSum + commentSum * 2;
    const avgEngagementRate = totalPosts > 0
      ? Math.round((engagementScore / (agg._sum.impressions ?? 1)) * 10000) / 100
      : 0;

    return {
      followers,
      newFollowers,
      impressions: agg._sum.impressions ?? 0,
      reactions: reactionSum,
      comments: commentSum,
      topPosts: ranked,
      followerGrowth,
      engagementOverTime,
      postFrequency,
      engagementScore,
      avgEngagementRate,
    };
  }

  /** Build a daily timeline of counts from individual timestamps. */
  private buildDailyTimeline(
    dates: Date[],
    startDate: Date,
    days: number,
  ): { date: string; count: number }[] {
    const buckets = new Map<string, number>();
    for (let i = 0; i < days; i++) {
      const d = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
      buckets.set(this.dateKey(d), 0);
    }
    for (const date of dates) {
      const key = this.dateKey(date);
      if (buckets.has(key)) {
        buckets.set(key, (buckets.get(key) ?? 0) + 1);
      }
    }
    return [...buckets.entries()].map(([date, count]) => ({ date, count }));
  }

  /** Build daily engagement from post-level data. */
  private buildEngagementTimeline(
    posts: { createdAt: Date; impressions: number; _count: { reactions: number; comments: number } }[],
    startDate: Date,
    days: number,
  ): { date: string; impressions: number; reactions: number; comments: number; posts: number }[] {
    const buckets = new Map<string, { impressions: number; reactions: number; comments: number; posts: number }>();
    for (let i = 0; i < days; i++) {
      const d = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
      buckets.set(this.dateKey(d), { impressions: 0, reactions: 0, comments: 0, posts: 0 });
    }
    for (const post of posts) {
      const key = this.dateKey(post.createdAt);
      const bucket = buckets.get(key);
      if (bucket) {
        bucket.impressions += post.impressions;
        bucket.reactions += post._count.reactions;
        bucket.comments += post._count.comments;
        bucket.posts += 1;
      }
    }
    return [...buckets.entries()].map(([date, data]) => ({ date, ...data }));
  }

  /** Build a weekly timeline of post counts. */
  private buildWeeklyTimeline(
    dates: Date[],
    startDate: Date,
    weeks: number,
  ): { week: string; count: number }[] {
    const buckets = new Map<string, number>();
    for (let i = 0; i < weeks; i++) {
      const d = new Date(startDate.getTime() + i * 7 * 24 * 60 * 60 * 1000);
      buckets.set(this.weekKey(d), 0);
    }
    for (const date of dates) {
      const key = this.weekKey(date);
      if (buckets.has(key)) {
        buckets.set(key, (buckets.get(key) ?? 0) + 1);
      }
    }
    return [...buckets.entries()].map(([week, count]) => ({ week, count }));
  }

  private dateKey(d: Date): string {
    return d.toISOString().slice(0, 10);
  }

  private weekKey(d: Date): string {
    const start = new Date(d);
    start.setDate(start.getDate() - start.getDay());
    return start.toISOString().slice(0, 10);
  }

  // ── Boosts (Phase 5) ──

  /**
   * Boost a page post for 24h using the existing Post.boostedUntil field.
   * Cost in credits (BOOST_COST_CREDITS, default 0 = free beta); one active
   * boost per post; only page staff, only the page's own posts.
   */
  async boostPost(pageId: string, postId: string, userId: string) {
    await this.requireRole(pageId, userId, "EDITOR");

    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      select: { id: true, pageId: true, boostedUntil: true },
    });
    if (!post || post.pageId !== pageId) {
      throw new NotFoundException("Post not found on this page");
    }
    if (post.boostedUntil && post.boostedUntil > new Date()) {
      throw new ConflictException("This post is already boosted");
    }

    const until = new Date(Date.now() + BOOST_HOURS * 60 * 60 * 1000);

    if (BOOST_COST_CREDITS > 0) {
      const updated = await this.prisma.user.updateMany({
        where: { id: userId, credits: { gte: BOOST_COST_CREDITS } },
        data: { credits: { decrement: BOOST_COST_CREDITS } },
      });
      if (updated.count === 0) {
        throw new ConflictException("Not enough credits");
      }
    }

    await this.prisma.post.update({
      where: { id: postId },
      data: { boostedUntil: until },
    });
    await this.notifications.notify({
      userId,
      actorId: userId,
      kind: "BOOST",
      entityId: postId,
      message: "BOOST_STARTED",
    }).catch(() => undefined);

    return { boostedUntil: until, costCredits: BOOST_COST_CREDITS };
  }

  // ── helpers ──

  private async isVerified(ownerId: string): Promise<boolean> {
    const profile = await this.prisma.sellerProfile.findUnique({
      where: { userId: ownerId },
      select: { verificationStatus: true },
    });
    return profile?.verificationStatus === "APPROVED";
  }

  /** Membership guard: OWNER passes; `min` sets the minimum (EDITOR default). */
  private async requireRole(pageId: string, userId: string, min: "OWNER" | "EDITOR") {
    const membership = await this.prisma.pageMember.findUnique({
      where: { pageId_userId: { pageId, userId } },
      select: { role: true },
    });
    if (!membership) {
      throw new ForbiddenException("You are not a member of this page");
    }
    if (min === "OWNER" && membership.role !== "OWNER") {
      throw new ForbiddenException("Only the page owner can do that");
    }
    return membership;
  }

  private mapPage(
    page: {
      id: string;
      name: string;
      username: string;
      category: string;
      description: string | null;
      image: string | null;
      coverImage: string | null;
      phone: string | null;
      createdAt: Date;
    },
    _viewerId: string | undefined,
    summary: {
      followerCount: number;
      postCount: number;
      verified: boolean;
      isFollowing: boolean;
      viewerRole: "OWNER" | "EDITOR" | null;
    }
  ): MappedPage {
    return {
      id: page.id,
      name: page.name,
      username: page.username,
      category: page.category,
      description: page.description,
      image: page.image,
      coverImage: page.coverImage,
      phone: page.phone,
      createdAt: page.createdAt,
      ...summary,
    };
  }
}
