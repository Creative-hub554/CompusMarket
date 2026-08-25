import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@theo/database";
import { PrismaService } from "../prisma/prisma.service";
import { NotificationsService } from "./notifications.service";
import { CreateCommentDto, CreatePostDto, PostMediaInputDto } from "./dto/social.dto";

const POST_INCLUDE = {
  author: { select: { id: true, name: true, username: true, image: true } },
  media: { orderBy: { position: Prisma.SortOrder.asc } },
  reactions: { select: { emoji: true, userId: true } },
  _count: { select: { comments: true } },
} satisfies Prisma.PostInclude;

type PostWithRelations = Prisma.PostGetPayload<{ include: typeof POST_INCLUDE }> & {
  pinnedAt?: Date | null;
};

export interface MappedPost {
  id: string;
  content: string;
  createdAt: Date;
  author: { id: string; name: string | null; username: string | null; image: string | null };
  media: { id: string; kind: "IMAGE" | "VIDEO"; url: string; thumbUrl: string | null; position: number }[];
  reactions: { emoji: string; count: number }[];
  commentCount: number;
  viewerReaction: string | null;
  pinned: boolean;
}

export function mapPost(post: PostWithRelations, viewerId?: string): MappedPost {
  const grouped = new Map<string, number>();
  for (const r of post.reactions) {
    grouped.set(r.emoji, (grouped.get(r.emoji) || 0) + 1);
  }
  return {
    id: post.id,
    content: post.content,
    createdAt: post.createdAt,
    author: post.author,
    media: post.media.map((m) => ({
      id: m.id,
      kind: m.kind,
      url: m.url,
      thumbUrl: m.thumbUrl,
      position: m.position,
    })),
    reactions: [...grouped.entries()]
      .map(([emoji, count]) => ({ emoji, count }))
      .sort((a, b) => b.count - a.count),
    commentCount: post._count.comments,
    viewerReaction: viewerId ? post.reactions.find((r) => r.userId === viewerId)?.emoji ?? null : null,
    pinned: Boolean(post.pinnedAt),
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
    return this.queryFeed({ authorId: { in: authorIds } }, userId, cursorId, limit);
  }

  async byAuthor(
    authorId: string,
    viewerId?: string,
    cursorId?: string,
    limit = 10
  ): Promise<{ items: MappedPost[]; nextCursor: string | null }> {
    return this.queryFeed({ authorId }, viewerId, cursorId, limit);
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
      include: POST_INCLUDE,
    });
    const hasMore = posts.length > limit;
    const items = posts.slice(0, limit).map((p) => mapPost(p, viewerId));
    return { items, nextCursor: hasMore ? items[items.length - 1].id : null };
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

    const existing = await this.prisma.reaction.findUnique({
      where: { postId_userId: { postId, userId } },
    });

    let reacted: boolean;
    if (existing && existing.emoji === emoji) {
      await this.prisma.reaction.delete({ where: { id: existing.id } });
      reacted = false;
    } else if (existing) {
      await this.prisma.reaction.update({ where: { id: existing.id }, data: { emoji } });
      reacted = true;
    } else {
      await this.prisma.reaction.create({ data: { postId, userId, emoji } });
      reacted = true;
    }

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

    if (dto.parentId) {
      const parent = await this.prisma.comment.findUnique({
        where: { id: dto.parentId },
        select: { postId: true, authorId: true },
      });
      if (!parent || parent.postId !== postId) {
        throw new BadRequestException("Invalid parent comment");
      }
      await this.notifications.notify({
        userId: parent.authorId,
        actorId: userId,
        kind: "COMMENT",
        entityId: postId,
      });
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

    await this.notifications.notify({
      userId: post.authorId,
      actorId: userId,
      kind: "COMMENT",
      entityId: postId,
    });

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
