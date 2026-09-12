import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { createOwnedResource, type OwnedResource } from "../common/owned-resource";
import type { Document, DocumentFolder } from "@theo/database";

type CreateDocument = { title: string; content?: string; folderId?: string };
type UpdateDocument = { title?: string; content?: string; folderId?: string | null };

@Injectable()
export class DocumentsService {
  private readonly documents: OwnedResource<Document, CreateDocument, UpdateDocument>;
  private readonly folders: OwnedResource<DocumentFolder, { name: string }, never>;

  constructor(prisma: PrismaService) {
    this.documents = createOwnedResource<Document, CreateDocument, UpdateDocument>(prisma.document, {
      name: "Document",
      createInclude: { folder: true },
      findOneInclude: { folder: true },
      updateInclude: { folder: true },
      listInclude: { folder: true },
      buildCreateData: (userId, data) => ({
        userId,
        title: data.title,
        content: data.content || "{}",
        folderId: data.folderId,
      }),
    });

    this.folders = createOwnedResource<DocumentFolder, { name: string }, never>(prisma.documentFolder, {
      name: "Folder",
      listOrderBy: { name: "asc" },
      listInclude: { _count: { select: { documents: true } } },
    });
  }

  create(userId: string, data: CreateDocument) {
    return this.documents.create(userId, data);
  }

  findByUser(userId: string) {
    return this.documents.findByUser(userId);
  }

  findOne(id: string, userId: string) {
    return this.documents.findOne(id, userId);
  }

  update(id: string, userId: string, data: UpdateDocument) {
    return this.documents.update(id, userId, data);
  }

  remove(id: string, userId: string) {
    return this.documents.remove(id, userId);
  }

  // Folders
  createFolder(userId: string, name: string) {
    return this.folders.create(userId, { name });
  }

  findFolders(userId: string) {
    return this.folders.findByUser(userId);
  }

  deleteFolder(id: string, userId: string) {
    return this.folders.remove(id, userId);
  }
}