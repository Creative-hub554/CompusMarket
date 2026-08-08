import { Test, TestingModule } from "@nestjs/testing";
import { NotFoundException, ForbiddenException } from "@nestjs/common";
import { DocumentsService } from "./documents.service";
import { PrismaService } from "../prisma/prisma.service";

describe("DocumentsService", () => {
  let service: DocumentsService;

  const doc = {
    id: "doc-1",
    userId: "user-1",
    title: "Doc",
    content: "{}",
    folderId: null,
    folder: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockPrisma = {
    document: {
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    documentFolder: {
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      delete: vi.fn(),
    },
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DocumentsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get<DocumentsService>(DocumentsService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("create", () => {
    it("defaults content to an empty JSON object", async () => {
      mockPrisma.document.create.mockResolvedValue(doc);
      await service.create("user-1", { title: "Doc" });
      expect(mockPrisma.document.create).toHaveBeenCalledWith({
        data: { userId: "user-1", title: "Doc", content: "{}", folderId: undefined },
        include: { folder: true },
      });
    });
  });

  describe("findOne", () => {
    it("throws NotFoundException when missing", async () => {
      mockPrisma.document.findUnique.mockResolvedValue(null);
      await expect(service.findOne("doc-1", "user-1")).rejects.toBeInstanceOf(NotFoundException);
    });

    it("throws ForbiddenException for another user's document", async () => {
      mockPrisma.document.findUnique.mockResolvedValue({ ...doc, userId: "other-user" });
      await expect(service.findOne("doc-1", "user-1")).rejects.toBeInstanceOf(ForbiddenException);
    });

    it("returns an owned document", async () => {
      mockPrisma.document.findUnique.mockResolvedValue(doc);
      await expect(service.findOne("doc-1", "user-1")).resolves.toEqual(doc);
    });
  });

  describe("update", () => {
    it("updates only the provided fields", async () => {
      mockPrisma.document.findUnique.mockResolvedValue(doc);
      mockPrisma.document.update.mockResolvedValue({ ...doc, title: "New" });
      await service.update("doc-1", "user-1", { title: "New" });
      expect(mockPrisma.document.update).toHaveBeenCalledWith({
        where: { id: "doc-1" },
        data: { title: "New" },
        include: { folder: true },
      });
    });

    it("rejects updating another user's document", async () => {
      mockPrisma.document.findUnique.mockResolvedValue({ ...doc, userId: "other-user" });
      await expect(service.update("doc-1", "user-1", { title: "New" })).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });
  });

  describe("folders", () => {
    it("creates a folder", async () => {
      mockPrisma.documentFolder.create.mockResolvedValue({ id: "folder-1" });
      await service.createFolder("user-1", "Recipes");
      expect(mockPrisma.documentFolder.create).toHaveBeenCalledWith({
        data: { userId: "user-1", name: "Recipes" },
      });
    });

    it("lists folders with document counts", async () => {
      mockPrisma.documentFolder.findMany.mockResolvedValue([{ id: "folder-1" }]);
      await service.findFolders("user-1");
      expect(mockPrisma.documentFolder.findMany).toHaveBeenCalledWith({
        where: { userId: "user-1" },
        orderBy: { name: "asc" },
        include: { _count: { select: { documents: true } } },
      });
    });

    it("throws NotFoundException when deleting a missing folder", async () => {
      mockPrisma.documentFolder.findUnique.mockResolvedValue(null);
      await expect(service.deleteFolder("folder-1", "user-1")).rejects.toBeInstanceOf(NotFoundException);
    });

    it("rejects deleting another user's folder", async () => {
      mockPrisma.documentFolder.findUnique.mockResolvedValue({ id: "folder-1", userId: "other-user" });
      await expect(service.deleteFolder("folder-1", "user-1")).rejects.toBeInstanceOf(ForbiddenException);
    });

    it("deletes an owned folder", async () => {
      mockPrisma.documentFolder.findUnique.mockResolvedValue({ id: "folder-1", userId: "user-1" });
      mockPrisma.documentFolder.delete.mockResolvedValue({ id: "folder-1" });
      await service.deleteFolder("folder-1", "user-1");
      expect(mockPrisma.documentFolder.delete).toHaveBeenCalledWith({ where: { id: "folder-1" } });
    });
  });
});
