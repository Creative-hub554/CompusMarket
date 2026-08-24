import { Test, TestingModule } from "@nestjs/testing";
import { NotFoundException, ForbiddenException } from "@nestjs/common";
import { ResumesService } from "./resumes.service";
import { PrismaService } from "../prisma/prisma.service";

describe("ResumesService", () => {
  let service: ResumesService;

  const mockPrisma = {
    resume: {
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
        ResumesService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get<ResumesService>(ResumesService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("create", () => {
    it("stores a deep clone of the resume data", async () => {
      mockPrisma.resume.create.mockResolvedValue({ id: "r1" });
      const data = { skills: ["react"], contact: { email: "a@b.c" } };

      await service.create("u1", "My Resume", data);

      expect(mockPrisma.resume.create).toHaveBeenCalledWith({
        data: { userId: "u1", title: "My Resume", data },
      });

      // Mutating the caller's object afterwards must not affect the stored copy
      data.skills.push("hacked");
      const stored = mockPrisma.resume.create.mock.calls[0][0].data.data;
      expect(stored.skills).toEqual(["react"]);
    });
  });

  describe("findByUser", () => {
    it("lists only the user's resumes, newest update first", async () => {
      mockPrisma.resume.findMany.mockResolvedValue([]);

      await service.findByUser("u1");

      expect(mockPrisma.resume.findMany).toHaveBeenCalledWith({
        where: { userId: "u1" },
        orderBy: { updatedAt: "desc" },
      });
    });
  });

  describe("findOne", () => {
    it("throws NotFound for a missing resume", async () => {
      mockPrisma.resume.findUnique.mockResolvedValue(null);
      await expect(service.findOne("missing", "u1")).rejects.toBeInstanceOf(NotFoundException);
    });

    it("throws Forbidden when the resume belongs to someone else", async () => {
      mockPrisma.resume.findUnique.mockResolvedValue({ id: "r1", userId: "someone-else" });
      await expect(service.findOne("r1", "u1")).rejects.toBeInstanceOf(ForbiddenException);
    });

    it("returns the resume for its owner", async () => {
      mockPrisma.resume.findUnique.mockResolvedValue({ id: "r1", userId: "u1" });

      const result = await service.findOne("r1", "u1");

      expect(result).toEqual({ id: "r1", userId: "u1" });
    });
  });

  describe("update", () => {
    it("rejects updates from non-owners", async () => {
      mockPrisma.resume.findUnique.mockResolvedValue({ id: "r1", userId: "someone-else" });
      await expect(service.update("r1", "u1", { title: "X" })).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      expect(mockPrisma.resume.update).not.toHaveBeenCalled();
    });

    it("updates only the provided fields", async () => {
      mockPrisma.resume.findUnique.mockResolvedValue({ id: "r1", userId: "u1" });
      mockPrisma.resume.update.mockResolvedValue({ id: "r1", title: "New" });

      const result = await service.update("r1", "u1", { title: "New" });

      expect(mockPrisma.resume.update).toHaveBeenCalledWith({
        where: { id: "r1" },
        data: { title: "New" },
      });
      expect(result.title).toBe("New");
    });

    it("omits undefined fields instead of writing nulls", async () => {
      mockPrisma.resume.findUnique.mockResolvedValue({ id: "r1", userId: "u1" });
      mockPrisma.resume.update.mockResolvedValue({ id: "r1" });

      await service.update("r1", "u1", {});

      expect(mockPrisma.resume.update).toHaveBeenCalledWith({
        where: { id: "r1" },
        data: {},
      });
    });
  });

  describe("remove", () => {
    it("deletes only for the owner", async () => {
      mockPrisma.resume.findUnique.mockResolvedValue({ id: "r1", userId: "u1" });
      mockPrisma.resume.delete.mockResolvedValue({ id: "r1" });

      await service.remove("r1", "u1");

      expect(mockPrisma.resume.delete).toHaveBeenCalledWith({ where: { id: "r1" } });
    });

    it("rejects deletion by non-owners", async () => {
      mockPrisma.resume.findUnique.mockResolvedValue({ id: "r1", userId: "someone-else" });
      await expect(service.remove("r1", "u1")).rejects.toBeInstanceOf(ForbiddenException);
      expect(mockPrisma.resume.delete).not.toHaveBeenCalled();
    });
  });
});
