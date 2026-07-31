import { Injectable, NotFoundException, ForbiddenException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import type { Prisma } from "@theo/database";

@Injectable()
export class NotesService {
  constructor(private prisma: PrismaService) {}
  async create(userId: string, data: { title: string; content?: string; tags?: string[] }) {
    return this.prisma.note.create({
      data: { userId, title: data.title, content: data.content || "", tags: structuredClone(data.tags || []) },
    });
  }

  async findByUser(userId: string, search?: string) {
    const where: Prisma.NoteWhereInput = { userId };
    if (search) {
      where.OR = [
        { title: { contains: search } },
        { content: { contains: search } },
      ];
    }
    return this.prisma.note.findMany({
      where,
      orderBy: { updatedAt: "desc" },
    });
  }

  async findOne(id: string, userId: string) {
    const note = await this.prisma.note.findUnique({ where: { id } });
    if (!note) throw new NotFoundException("Note not found");
    if (note.userId !== userId) throw new ForbiddenException();
    return note;
  }

  async update(id: string, userId: string, data: { title?: string; content?: string; tags?: string[] }) {
    await this.findOne(id, userId);
    return this.prisma.note.update({
      where: { id },
      data: {
        ...(data.title !== undefined && { title: data.title }),
        ...(data.content !== undefined && { content: data.content }),
        ...(data.tags !== undefined && { tags: structuredClone(data.tags) }),
      },
    });
  }

  async remove(id: string, userId: string) {
    await this.findOne(id, userId);
    return this.prisma.note.delete({ where: { id } });
  }
}
