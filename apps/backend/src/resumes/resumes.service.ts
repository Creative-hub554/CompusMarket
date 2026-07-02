import { Injectable, NotFoundException, ForbiddenException } from "@nestjs/common";
import { prisma } from "@theo/database";
import type { Resume } from "@theo/database";

@Injectable()
export class ResumesService {
  async create(userId: string, title: string, data: Record<string, unknown>) {
    return prisma.resume.create({
      data: { userId, title, data: JSON.parse(JSON.stringify(data)) },
    });
  }

  async findByUser(userId: string): Promise<Resume[]> {
    return prisma.resume.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
    });
  }

  async findOne(id: string, userId: string): Promise<Resume> {
    const resume = await prisma.resume.findUnique({ where: { id } });
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
    return prisma.resume.update({
      where: { id },
      data: {
        ...(data.title && { title: data.title }),
        ...(data.data && { data: JSON.parse(JSON.stringify(data.data)) }),
      },
    });
  }

  async remove(id: string, userId: string) {
    await this.findOne(id, userId);
    return prisma.resume.delete({ where: { id } });
  }
}
