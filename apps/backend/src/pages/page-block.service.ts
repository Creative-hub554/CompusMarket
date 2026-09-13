import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class PageBlockService {
  constructor(private prisma: PrismaService) {}

  async block(userId: string, pageId: string): Promise<{ blocked: boolean }> {
    const page = await this.prisma.page.findUnique({ where: { id: pageId }, select: { id: true } });
    if (!page) throw new NotFoundException("Page not found");

    const existing = await this.prisma.pageBlock.findUnique({
      where: { pageId_userId: { pageId, userId } },
    });
    if (existing) throw new ConflictException("You have already blocked this page");

    await this.prisma.pageBlock.create({ data: { pageId, userId } });

    // Also unfollow the page when blocking
    await this.prisma.pageFollow.deleteMany({ where: { pageId, userId } }).catch(() => undefined);

    return { blocked: true };
  }

  async unblock(userId: string, pageId: string): Promise<{ blocked: boolean }> {
    const existing = await this.prisma.pageBlock.findUnique({
      where: { pageId_userId: { pageId, userId } },
    });
    if (!existing) throw new NotFoundException("Block not found");

    await this.prisma.pageBlock.delete({ where: { id: existing.id } });
    return { blocked: false };
  }

  async isBlocked(userId: string, pageId: string): Promise<boolean> {
    const block = await this.prisma.pageBlock.findUnique({
      where: { pageId_userId: { pageId, userId } },
      select: { id: true },
    });
    return Boolean(block);
  }

  /** Return page IDs the user has blocked, for feed filtering. */
  async blockedPageIds(userId: string): Promise<string[]> {
    const blocks = await this.prisma.pageBlock.findMany({
      where: { userId },
      select: { pageId: true },
    });
    return blocks.map((b) => b.pageId);
  }
}
