import { Injectable, NotFoundException, ForbiddenException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class DocumentsService {
  constructor(private prisma: PrismaService) {}
  async create(userId: string, data: { title: string; content?: string; folderId?: string }) {
    return this.prisma.document.create({
      data: { userId, title: data.title, content: data.content || "{}", folderId: data.folderId },
      include: { folder: true },
    });
  }

  async findByUser(userId: string) {
    return this.prisma.document.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      include: { folder: true },
    });
  }

  async findOne(id: string, userId: string) {
    const doc = await this.prisma.document.findUnique({ where: { id }, include: { folder: true } });
    if (!doc) throw new NotFoundException("Document not found");
    if (doc.userId !== userId) throw new ForbiddenException();
    return doc;
  }

  async update(id: string, userId: string, data: { title?: string; content?: string; folderId?: string | null }) {
    await this.findOne(id, userId);
    return this.prisma.document.update({
      where: { id },
      data: {
        ...(data.title !== undefined && { title: data.title }),
        ...(data.content !== undefined && { content: data.content }),
        ...(data.folderId !== undefined && { folderId: data.folderId }),
      },
      include: { folder: true },
    });
  }

  async remove(id: string, userId: string) {
    await this.findOne(id, userId);
    return this.prisma.document.delete({ where: { id } });
  }

  // Folders
  async createFolder(userId: string, name: string) {
    return this.prisma.documentFolder.create({ data: { userId, name } });
  }

  async findFolders(userId: string) {
    return this.prisma.documentFolder.findMany({
      where: { userId },
      orderBy: { name: "asc" },
      include: { _count: { select: { documents: true } } },
    });
  }

  async deleteFolder(id: string, userId: string) {
    const folder = await this.prisma.documentFolder.findUnique({ where: { id } });
    if (!folder) throw new NotFoundException("Folder not found");
    if (folder.userId !== userId) throw new ForbiddenException();
    return this.prisma.documentFolder.delete({ where: { id } });
  }
}
