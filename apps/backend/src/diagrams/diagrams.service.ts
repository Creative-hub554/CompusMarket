import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { createOwnedResource, type OwnedResource } from "../common/owned-resource";
import type { Diagram } from "@theo/database";

type CreateDiagram = { title: string; code: string; type?: string };
type UpdateDiagram = { title?: string; code?: string; type?: string };

@Injectable()
export class DiagramsService {
  private readonly diagrams: OwnedResource<Diagram, CreateDiagram, UpdateDiagram>;

  constructor(prisma: PrismaService) {
    this.diagrams = createOwnedResource<Diagram, CreateDiagram, UpdateDiagram>(prisma.diagram, {
      name: "Diagram",
      buildCreateData: (userId, data) => ({
        userId,
        title: data.title,
        code: data.code,
        type: data.type || "flowchart",
      }),
    });
  }

  create(userId: string, data: CreateDiagram) {
    return this.diagrams.create(userId, data);
  }

  findByUser(userId: string) {
    return this.diagrams.findByUser(userId);
  }

  findOne(id: string, userId: string) {
    return this.diagrams.findOne(id, userId);
  }

  update(id: string, userId: string, data: UpdateDiagram) {
    return this.diagrams.update(id, userId, data);
  }

  remove(id: string, userId: string) {
    return this.diagrams.remove(id, userId);
  }
}