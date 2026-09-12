import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { createOwnedResource, type OwnedResource } from "../common/owned-resource";
import type { Note } from "@theo/database";

type CreateNote = { title: string; content?: string; tags?: string[] };
type UpdateNote = { title?: string; content?: string; tags?: string[] };

@Injectable()
export class NotesService {
  private readonly notes: OwnedResource<Note, CreateNote, UpdateNote>;

  constructor(prisma: PrismaService) {
    this.notes = createOwnedResource<Note, CreateNote, UpdateNote>(prisma.note, {
      name: "Note",
      buildCreateData: (userId, data) => ({
        userId,
        title: data.title,
        content: data.content || "",
        tags: structuredClone(data.tags || []),
      }),
      buildUpdateData: (data) => ({
        ...(data.title !== undefined && { title: data.title }),
        ...(data.content !== undefined && { content: data.content }),
        ...(data.tags !== undefined && { tags: structuredClone(data.tags) }),
      }),
      listWhere: (userId, search) =>
        search
          ? {
              userId,
              OR: [
                { title: { contains: search } },
                { content: { contains: search } },
              ],
            }
          : { userId },
    });
  }

  create(userId: string, data: CreateNote) {
    return this.notes.create(userId, data);
  }

  findByUser(userId: string, search?: string) {
    return this.notes.findByUser(userId, search);
  }

  findOne(id: string, userId: string) {
    return this.notes.findOne(id, userId);
  }

  update(id: string, userId: string, data: UpdateNote) {
    return this.notes.update(id, userId, data);
  }

  remove(id: string, userId: string) {
    return this.notes.remove(id, userId);
  }
}