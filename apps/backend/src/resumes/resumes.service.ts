import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { createOwnedResource, type OwnedResource } from "../common/owned-resource";
import type { Prisma, Resume } from "@theo/database";

type CreateResume = { title: string; data: Record<string, unknown> };
type UpdateResume = { title?: string; data?: Record<string, unknown> };

@Injectable()
export class ResumesService {
  private readonly resumes: OwnedResource<Resume, CreateResume, UpdateResume>;

  constructor(prisma: PrismaService) {
    this.resumes = createOwnedResource<Resume, CreateResume, UpdateResume>(prisma.resume, {
      name: "Resume",
      buildCreateData: (userId, data) => ({
        userId,
        title: data.title,
        data: structuredClone(data.data) as Prisma.InputJsonValue,
      }),
      buildUpdateData: (data) => ({
        ...(data.title !== undefined && { title: data.title }),
        ...(data.data !== undefined && { data: structuredClone(data.data) as Prisma.InputJsonValue }),
      }),
    });
  }

  create(userId: string, data: CreateResume) {
    return this.resumes.create(userId, data);
  }

  findByUser(userId: string) {
    return this.resumes.findByUser(userId);
  }

  findOne(id: string, userId: string) {
    return this.resumes.findOne(id, userId);
  }

  update(id: string, userId: string, data: UpdateResume) {
    return this.resumes.update(id, userId, data);
  }

  remove(id: string, userId: string) {
    return this.resumes.remove(id, userId);
  }
}