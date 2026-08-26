import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateStoryDto } from "./dto/social.dto";

const STORY_TTL_MS = 24 * 60 * 60 * 1000;

export interface StoryGroup {
  author: { id: string; name: string | null; username: string | null; image: string | null };
  stories: {
    id: string;
    mediaUrl: string;
    mediaKind: "IMAGE" | "VIDEO";
    caption: string | null;
    createdAt: Date;
    viewed: boolean;
  }[];
  allViewed: boolean;
}

@Injectable()
export class StoriesService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, dto: CreateStoryDto) {
    return this.prisma.story.create({
      data: {
        authorId: userId,
        mediaUrl: dto.mediaUrl,
        mediaKind: dto.mediaKind,
        caption: dto.caption,
        expiresAt: new Date(Date.now() + STORY_TTL_MS),
      },
    });
  }

  async feedForViewer(viewerId: string): Promise<StoryGroup[]> {
    const following = await this.prisma.follow.findMany({
      where: { followerId: viewerId },
      select: { followingId: true },
      take: 200,
    });
    const authors = [viewerId, ...following.map((f) => f.followingId)];

    const stories = await this.prisma.story.findMany({
      where: { authorId: { in: authors }, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: "desc" },
      take: 300,
      include: {
        author: { select: { id: true, name: true, username: true, image: true } },
        views: { where: { userId: viewerId }, select: { userId: true } },
      },
    });

    const groups = new Map<string, StoryGroup>();
    for (const s of [...stories].reverse()) {
      let group = groups.get(s.author.id);
      if (!group) {
        group = { author: s.author, stories: [], allViewed: true };
        groups.set(s.author.id, group);
      }
      const viewed = s.views.length > 0;
      group.stories.push({
        id: s.id,
        mediaUrl: s.mediaUrl,
        mediaKind: s.mediaKind,
        caption: s.caption,
        createdAt: s.createdAt,
        viewed,
      });
      if (!viewed) group.allViewed = false;
    }

    // Own stories first, then unseen, then the rest.
    return [...groups.values()].sort((a, b) => {
      if (a.author.id === viewerId) return -1;
      if (b.author.id === viewerId) return 1;
      if (a.allViewed !== b.allViewed) return a.allViewed ? 1 : -1;
      return 0;
    });
  }

  async view(storyId: string, userId: string): Promise<void> {
    await this.prisma.storyView
      .create({ data: { storyId, userId } })
      .catch(() => null);
  }

  async remove(storyId: string, userId: string, role?: string): Promise<void> {
    const story = await this.prisma.story.findUnique({
      where: { id: storyId },
      select: { authorId: true },
    });
    if (!story) throw new NotFoundException("Story not found");
    if (story.authorId !== userId && role !== "ADMIN") {
      throw new ForbiddenException("You can only delete your own stories");
    }
    await this.prisma.story.delete({ where: { id: storyId } });
  }
}
