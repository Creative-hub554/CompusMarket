import { Injectable, NotFoundException, ForbiddenException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import type { Prisma, Resume } from "@theo/database";

@Injectable()
export class ResumesService {
  constructor(private prisma: PrismaService) {}
  async create(userId: string, title: string, data: Record<string, unknown>) {
    return this.prisma.resume.create({
      data: { userId, title, data: structuredClone(data) as Prisma.InputJsonValue },
    });
  }

  async findByUser(userId: string): Promise<Resume[]> {
    return this.prisma.resume.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
    });
  }

  async findOne(id: string, userId: string): Promise<Resume> {
    const resume = await this.prisma.resume.findUnique({ where: { id } });
    if (!resume) throw new NotFoundException("Resume not found");
    if (resume.userId !== userId) throw new ForbiddenException();
    return resume;
  }

  async update(
    id: string,
    userId: string,
    data: { title?: string; data?: Record<string, unknown> }
  ) {
    await this.findOne(id, userId);
    return this.prisma.resume.update({
      where: { id },
      data: {
        ...(data.title && { title: data.title }),
        ...(data.data && { data: structuredClone(data.data) as Prisma.InputJsonValue }),
      },
    });
  }

  async remove(id: string, userId: string) {
    await this.findOne(id, userId);
    return this.prisma.resume.delete({ where: { id } });
  }
}
