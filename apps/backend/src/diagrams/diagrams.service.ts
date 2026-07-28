import { Injectable, NotFoundException, ForbiddenException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class DiagramsService {
  constructor(private prisma: PrismaService) {}
  async create(userId: string, data: { title: string; code: string; type?: string }) {
    return this.prisma.diagram.create({
      data: { userId, title: data.title, code: data.code, type: data.type || "flowchart" },
    });
  }

  async findByUser(userId: string) {
    return this.prisma.diagram.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
    });
  }

  async findOne(id: string, userId: string) {
    const diagram = await this.prisma.diagram.findUnique({ where: { id } });
    if (!diagram) throw new NotFoundException("Diagram not found");
    if (diagram.userId !== userId) throw new ForbiddenException();
    return diagram;
  }

  async update(id: string, userId: string, data: { title?: string; code?: string; type?: string }) {
    await this.findOne(id, userId);
    return this.prisma.diagram.update({
      where: { id },
      data: {
        ...(data.title !== undefined && { title: data.title }),
        ...(data.code !== undefined && { code: data.code }),
        ...(data.type !== undefined && { type: data.type }),
      },
    });
  }

  async remove(id: string, userId: string) {
    await this.findOne(id, userId);
    return this.prisma.diagram.delete({ where: { id } });
  }
}
