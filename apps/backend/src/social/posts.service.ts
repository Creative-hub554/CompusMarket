import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@theo/database";
import { PrismaService } from "../prisma/prisma.service";
import { NotificationsService } from "./notifications.service";
import { CreateCommentDto, CreatePostDto, PostMediaInputDto } from "./dto/social.dto";

const LIST_POST_INCLUDE = {
  author: { select: { id: true, name: true, username: true, image: true } },
  media: { orderBy: { position: Prisma.SortOrder.asc } },
  group: { select: { id: true, name: true } },
  _count: { select: { comments: true } },
} satisfies Prisma.PostInclude;

const POST_INCLUDE = {
  ...LIST_POST_INCLUDE,
  reactions: { select: { emoji: true, userId: true } },
  bookmarks: { select: { userId: true } },
} satisfies Prisma.PostInclude;

type PostWithRelations = Prisma.PostGetPayload<{ include: typeof POST_INCLUDE }> & {
  pinnedAt?: Date | null;
};

type ListPost = Prisma.PostGetPayload<{ include: typeof LIST_POST_INCLUDE }> & {
  pinnedAt?: Date | null;
};

export interface MappedPost {
  id: string;
  content: string;
  createdAt: Date;
  author: { id: string; name: string | null; username: string | null; image: string | null };
  group: { id: string; name: string } | null;
  media: { id: string; kind: "IMAGE" | "VIDEO"; url: string; thumbUrl: string | null; position: number }[];
  reactions: { emoji: string; count: number }[];
  commentCount: number;
  viewerReaction: string | null;
  pinned: boolean;
  bookmarked: boolean;
}

export function mapPost(post: PostWithRelations, viewerId?: string): MappedPost {
  const grouped = new Map<string, number>();
  for (const r of post.reactions) {
    grouped.set(r.emoji, (grouped.get(r.emoji) || 0) + 1);
  }
  return finalizePost(post, {
    reactions: [...grouped.entries()]
      .map(([emoji, count]) => ({ emoji, count }))
      .sort((a, b) => b.count - a.count),
    viewerReaction: viewerId
      ? post.reactions.find((r) => r.userId === viewerId)?.emoji ?? null
      : null,
    bookmarked: viewerId ? post.bookmarks.some((b) => b.userId === viewerId) : false,
  });
}

function finalizePost(
  post: Pick<
    PostWithRelations,
    "id" | "content" | "createdAt" | "author" | "group" | "media" | "_count" | "pinnedAt"
  >,
  summary: { reactions: { emoji: string; count: number }[]; viewerReaction: string | null; bookmarked: boolean }
): MappedPost {
  return {
    id: post.id,
    content: post.content,
    createdAt: post.createdAt,
    author: post.author,
    group: post.group,
    media: post.media.map((m) => ({
      id: m.id,
      kind: m.kind,
      url: m.url,
      thumbUrl: m.thumbUrl,
      position: m.position,
    })),
    reactions: summary.reactions,
    commentCount: post._count.comments,
    viewerReaction: summary.viewerReaction,
    pinned: Boolean(post.pinnedAt),
    bookmarked: summary.bookmarked,
  };
}

@Injectable()
export class PostsService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService
  ) {}

  async create(userId: string, dto: CreatePostDto, groupId?: string): Promise<MappedPost> {
    const content = dto.content?.trim() ?? "";
    const media = dto.media ?? [];
    if (!content && media.length === 0) {
      throw new BadRequestException("Post must have content or media");
    }
    this.validateMedia(media);

    const post = await this.prisma.post.create({
      data: {
        authorId: userId,
        ...(groupId ? { groupId } : {}),
        content,
        media: {
          create: media.map((m, i) => ({
            url: m.url,
            kind: m.kind,
            thumbUrl: m.thumbUrl,
            position: i,
          })),
        },
      },
      include: POST_INCLUDE,
    });

    await this.notifyMentions(post.id, content, userId);

    return mapPost(post, userId);
  }

  /**
   * Resolve @username tokens in the content to real users and notify them.
   * Unknown usernames are ignored; the author never notifies themselves.
   */
  private async notifyMentions(
    postId: string,
    content: string,
    authorId: string
  ): Promise<void> {
    const usernames = [
      ...new Set(
        [...content.matchAll(/@([a-zA-Z0-9_.]{2,20})/g)].map((m) => m[1])
      ),
    ];
    if (usernames.length === 0) return;

    const users = await this.prisma.user.findMany({
      where: { username: { in: usernames } },
      select: { id: true },
    });
    const recipients = users.filter((u) => u.id !== authorId);

    await Promise.all(
      recipients.map((u) =>
        this.notifications.notify({
          userId: u.id,
          actorId: authorId,
          kind: "MENTION",
          entityId: postId,
        })
      )
    );
  }

  async findOne(id: string, viewerId?: string): Promise<MappedPost> {
    const post = await this.prisma.post.findUnique({ where: { id }, include: POST_INCLUDE });
    if (!post) throw new NotFoundException("Post not found");
    return mapPost(post, viewerId);
  }

  async feed(
    userId: string,
    cursorId?: string,
    limit = 10
  ): Promise<{ items: MappedPost[]; nextCursor: string | null }> {
    const following = await this.prisma.follow.findMany({
      where: { followerId: userId },
      select: { followingId: true },
    });
    const authorIds = [...following.map((f) => f.followingId), userId];

    // Facebook-style: the feed also carries posts from groups you belong to.
    const myGroups = await this.prisma.groupMember.findMany({
      where: { userId },
      select: { groupId: true },
    });

    return this.queryFeed(
      {
        OR: [
          { authorId: { in: authorIds } },
          { groupId: { in: myGroups.map((g) => g.groupId) } },
        ],
      },
      userId,
      cursorId,
      limit
    );
  }

  async byAuthor(
    authorId: string,
    viewerId?: string,
    cursorId?: string,
    limit = 10
  ): Promise<{ items: MappedPost[]; nextCursor: string | null }> {
    return this.queryFeed({ authorId }, viewerId, cursorId, limit);
  }

  /** Posts the viewer has bookmarked, newest bookmark first. */
  async bookmarksFor(userId: string, cursorId?: string, limit = 10) {
    const bookmarks = await this.prisma.bookmark.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: limit + 1,
      ...(cursorId ? { cursor: { id: cursorId }, skip: 1 } : {}),
      include: { post: { include: LIST_POST_INCLUDE } },
    });
    const hasMore = bookmarks.length > limit;
    const items = await this.hydratePosts(
      bookmarks.slice(0, limit).map((b) => b.post),
      userId
    );
    return { items, nextCursor: hasMore ? items[items.length - 1].id : null };
  }

  /** Toggle the viewer's bookmark on a post. */
  async toggleBookmark(userId: string, postId: string) {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      select: { id: true },
    });
    if (!post) throw new NotFoundException("Post not found");

    const existing = await this.prisma.bookmark.findUnique({
      where: { postId_userId: { postId, userId } },
    });
    if (existing) {
      await this.prisma.bookmark.delete({ where: { id: existing.id } });
      return { bookmarked: false };
    }
    await this.prisma.bookmark.create({ data: { postId, userId } });
    return { bookmarked: true };
  }

  async byGroup(
    groupId: string,
    viewerId?: string,
    cursorId?: string,
    limit = 10
  ): Promise<{ items: MappedPost[]; nextCursor: string | null }> {
    return this.queryFeed(
      { groupId },
      viewerId,
      cursorId,
      limit,
      [{ pinnedAt: { sort: "desc", nulls: "last" } }, { createdAt: "desc" }]
    );
  }

  private async queryFeed(
    where: Prisma.PostWhereInput,
    viewerId: string | undefined,
    cursorId: string | undefined,
    limit: number,
    orderBy: Prisma.PostOrderByWithRelationInput[] = [{ createdAt: "desc" }]
  ) {
    const posts = await this.prisma.post.findMany({
      where,
      orderBy,
      take: limit + 1,
      ...(cursorId ? { cursor: { id: cursorId }, skip: 1 } : {}),
      include: LIST_POST_INCLUDE,
    });
    const hasMore = posts.length > limit;
    const page = posts.slice(0, limit);
    const items = await this.hydratePosts(page, viewerId);
    return { items, nextCursor: hasMore ? items[items.length - 1].id : null };
  }

  private async hydratePosts(posts: ListPost[], viewerId?: string): Promise<MappedPost[]> {
    if (posts.length === 0) return [];
    const ids = posts.map((p) => p.id);

    const [tallies, viewerReactions, viewerBookmarks] = await Promise.all([
      this.prisma.reaction.groupBy({
        by: ["postId", "emoji"],
        where: { postId: { in: ids } },
        _count: { emoji: true },
      }),
      viewerId
        ? this.prisma.reaction.findMany({
            where: { postId: { in: ids }, userId: viewerId },
            select: { postId: true, emoji: true },
          })
        : Promise.resolve<{ postId: string; emoji: string }[]>([]),
      viewerId
        ? this.prisma.bookmark.findMany({
            where: { postId: { in: ids }, userId: viewerId },
            select: { postId: true },
          })
        : Promise.resolve<{ postId: string }[]>([]),
    ]);

    const talliesByPost = new Map<string, { emoji: string; count: number }[]>();
    for (const t of tallies) {
      const list = talliesByPost.get(t.postId) ?? [];
      list.push({ emoji: t.emoji, count: t._count.emoji });
      talliesByPost.set(t.postId, list);
    }
    const reactionByPost = new Map(viewerReactions.map((r) => [r.postId, r.emoji]));
    const bookmarkedIds = new Set(viewerBookmarks.map((b) => b.postId));

    return posts.map((post) =>
      finalizePost(post, {
        reactions: (talliesByPost.get(post.id) ?? []).sort((a, b) => b.count - a.count),
        viewerReaction: reactionByPost.get(post.id) ?? null,
        bookmarked: bookmarkedIds.has(post.id),
      })
    );
  }

  async update(id: string, userId: string, content: string): Promise<MappedPost> {
    const post = await this.prisma.post.findUnique({ where: { id }, select: { authorId: true } });
    if (!post) throw new NotFoundException("Post not found");
    if (post.authorId !== userId) throw new ForbiddenException("You can only edit your own posts");

    const updated = await this.prisma.post.update({
      where: { id },
      data: { content: content.trim() },
      include: POST_INCLUDE,
    });
    return mapPost(updated, userId);
  }

  async remove(id: string, userId: string, role?: string): Promise<void> {
    const post = await this.prisma.post.findUnique({ where: { id }, select: { authorId: true } });
    if (!post) throw new NotFoundException("Post not found");
    if (post.authorId !== userId && role !== "ADMIN") {
      throw new ForbiddenException("You can only delete your own posts");
    }
    await this.prisma.post.delete({ where: { id } });
  }

  async react(userId: string, postId: string, emoji: string) {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      select: { authorId: true },
    });
    if (!post) throw new NotFoundException("Post not found");

    const reacted = await this.prisma.$transaction(async (tx) => {
      const existing = await tx.reaction.findUnique({
        where: { postId_userId: { postId, userId } },
        select: { id: true, emoji: true },
      });

      if (existing && existing.emoji === emoji) {
        await tx.reaction.delete({ where: { id: existing.id } });
        return false;
      }
      if (existing) {
        await tx.reaction.update({ where: { id: existing.id }, data: { emoji } });
        return true;
      }
      const created = await tx.reaction
        .create({ data: { postId, userId, emoji } })
        .catch(() => null);
      if (!created) {
        await tx.reaction.update({
          where: { postId_userId: { postId, userId } },
          data: { emoji },
        });
      }
      return true;
    });

    if (reacted) {
      await this.notifications.notify({
        userId: post.authorId,
        actorId: userId,
        kind: "REACTION",
        entityId: postId,
        message: emoji,
      });
    }

    const counts = await this.prisma.reaction.groupBy({
      by: ["emoji"],
      where: { postId },
      _count: { emoji: true },
    });
    return {
      reacted,
      viewerReaction: reacted ? emoji : null,
      reactions: counts
        .map((c) => ({ emoji: c.emoji, count: c._count.emoji }))
        .sort((a, b) => b.count - a.count),
    };
  }

  async comment(userId: string, postId: string, dto: CreateCommentDto) {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      select: { authorId: true },
    });
    if (!post) throw new NotFoundException("Post not found");

    let parentAuthorId: string | null = null;
    if (dto.parentId) {
      const parent = await this.prisma.comment.findUnique({
        where: { id: dto.parentId },
        select: { postId: true, authorId: true },
      });
      if (!parent || parent.postId !== postId) {
        throw new BadRequestException("Invalid parent comment");
      }
      parentAuthorId = parent.authorId;
    }

    const comment = await this.prisma.comment.create({
      data: {
        postId,
        authorId: userId,
        parentId: dto.parentId,
        content: dto.content.trim(),
      },
      include: { author: { select: { id: true, name: true, username: true, image: true } } },
    });

    await Promise.all([
      parentAuthorId
        ? this.notifications.notify({
            userId: parentAuthorId,
            actorId: userId,
            kind: "COMMENT",
            entityId: postId,
          })
        : Promise.resolve(),
      this.notifications.notify({
        userId: post.authorId,
        actorId: userId,
        kind: "COMMENT",
        entityId: postId,
      }),
    ]);

    return comment;
  }

  async removeComment(commentId: string, userId: string, role?: string): Promise<void> {
    const comment = await this.prisma.comment.findUnique({
      where: { id: commentId },
      select: { authorId: true },
    });
    if (!comment) throw new NotFoundException("Comment not found");
    if (comment.authorId !== userId && role !== "ADMIN") {
      throw new ForbiddenException("You can only delete your own comments");
    }
    await this.prisma.comment.delete({ where: { id: commentId } });
  }

  listComments(postId: string) {
    return this.prisma.comment.findMany({
      where: { postId },
      orderBy: { createdAt: "asc" },
      include: { author: { select: { id: true, name: true, username: true, image: true } } },
    });
  }

  private validateMedia(media: PostMediaInputDto[]): void {
    const images = media.filter((m) => m.kind === "IMAGE").length;
    const videos = media.filter((m) => m.kind === "VIDEO").length;
    if (videos > 1) throw new BadRequestException("A post can contain at most one video");
    if (videos > 0 && media.length > 1) {
      throw new BadRequestException("A video cannot be combined with other media");
    }
    if (images > 8) throw new BadRequestException("A post can contain at most 8 images");
  }
}
