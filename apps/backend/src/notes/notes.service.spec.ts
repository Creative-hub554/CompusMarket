import { Test, TestingModule } from "@nestjs/testing";
import { NotFoundException, ForbiddenException } from "@nestjs/common";
import { NotesService } from "./notes.service";
import { PrismaService } from "../prisma/prisma.service";

describe("NotesService", () => {
  let service: NotesService;

  const mockNote = {
    id: "note-1",
    userId: "user-1",
    title: "Hello",
    content: "World",
    tags: ["work"],
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
  };

  const mockPrisma = {
    note: {
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotesService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get<NotesService>(NotesService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("create", () => {
    it("creates a note with default content and empty tags", async () => {
      mockPrisma.note.create.mockResolvedValue(mockNote);
      await service.create("user-1", { title: "Hello" });
      expect(mockPrisma.note.create).toHaveBeenCalledWith({
        data: { userId: "user-1", title: "Hello", content: "", tags: [] },
      });
    });

    it("passes provided content and tags through", async () => {
      mockPrisma.note.create.mockResolvedValue(mockNote);
      await service.create("user-1", { title: "Hello", content: "World", tags: ["work"] });
      expect(mockPrisma.note.create).toHaveBeenCalledWith({
        data: { userId: "user-1", title: "Hello", content: "World", tags: ["work"] },
      });
    });
  });

  describe("findByUser", () => {
    it("filters by userId with no search term", async () => {
      mockPrisma.note.findMany.mockResolvedValue([mockNote]);
      await service.findByUser("user-1");
      expect(mockPrisma.note.findMany).toHaveBeenCalledWith({
        where: { userId: "user-1" },
        orderBy: { updatedAt: "desc" },
      });
    });

    it("adds title/content OR filters when searching", async () => {
      mockPrisma.note.findMany.mockResolvedValue([mockNote]);
      await service.findByUser("user-1", "hello");
      expect(mockPrisma.note.findMany).toHaveBeenCalledWith({
        where: {
          userId: "user-1",
          OR: [{ title: { contains: "hello" } }, { content: { contains: "hello" } }],
        },
        orderBy: { updatedAt: "desc" },
      });
    });
  });

  describe("findOne", () => {
    it("throws NotFoundException when the note does not exist", async () => {
      mockPrisma.note.findUnique.mockResolvedValue(null);
      await expect(service.findOne("missing", "user-1")).rejects.toBeInstanceOf(NotFoundException);
    });

    it("throws ForbiddenException for another user's note", async () => {
      mockPrisma.note.findUnique.mockResolvedValue({ ...mockNote, userId: "other-user" });
      await expect(service.findOne("note-1", "user-1")).rejects.toBeInstanceOf(ForbiddenException);
    });

    it("returns the note when it belongs to the user", async () => {
      mockPrisma.note.findUnique.mockResolvedValue(mockNote);
      await expect(service.findOne("note-1", "user-1")).resolves.toEqual(mockNote);
    });
  });

  describe("update", () => {
    it("updates only the fields provided", async () => {
      mockPrisma.note.findUnique.mockResolvedValue(mockNote);
      mockPrisma.note.update.mockResolvedValue({ ...mockNote, title: "New title" });
      await service.update("note-1", "user-1", { title: "New title" });
      expect(mockPrisma.note.update).toHaveBeenCalledWith({
        where: { id: "note-1" },
        data: { title: "New title" },
      });
    });

    it("rejects updating another user's note", async () => {
      mockPrisma.note.findUnique.mockResolvedValue({ ...mockNote, userId: "other-user" });
      await expect(service.update("note-1", "user-1", { title: "New title" })).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      expect(mockPrisma.note.update).not.toHaveBeenCalled();
    });
  });

  describe("remove", () => {
    it("deletes an owned note", async () => {
      mockPrisma.note.findUnique.mockResolvedValue(mockNote);
      mockPrisma.note.delete.mockResolvedValue(mockNote);
      await service.remove("note-1", "user-1");
      expect(mockPrisma.note.delete).toHaveBeenCalledWith({ where: { id: "note-1" } });
    });

    it("rejects deleting another user's note", async () => {
      mockPrisma.note.findUnique.mockResolvedValue({ ...mockNote, userId: "other-user" });
      await expect(service.remove("note-1", "user-1")).rejects.toBeInstanceOf(ForbiddenException);
      expect(mockPrisma.note.delete).not.toHaveBeenCalled();
    });
  });
});
