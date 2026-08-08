import { Test, TestingModule } from "@nestjs/testing";
import { NotFoundException, ForbiddenException } from "@nestjs/common";
import { DiagramsService } from "./diagrams.service";
import { PrismaService } from "../prisma/prisma.service";

describe("DiagramsService", () => {
  let service: DiagramsService;

  const diagram = {
    id: "diagram-1",
    userId: "user-1",
    title: "Flow",
    code: "graph TD; A-->B;",
    type: "flowchart",
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockPrisma = {
    diagram: {
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
        DiagramsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get<DiagramsService>(DiagramsService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("create", () => {
    it("defaults the type to flowchart", async () => {
      mockPrisma.diagram.create.mockResolvedValue(diagram);
      await service.create("user-1", { title: "Flow", code: "graph TD; A-->B;" });
      expect(mockPrisma.diagram.create).toHaveBeenCalledWith({
        data: { userId: "user-1", title: "Flow", code: "graph TD; A-->B;", type: "flowchart" },
      });
    });

    it("honors an explicit type", async () => {
      mockPrisma.diagram.create.mockResolvedValue(diagram);
      await service.create("user-1", { title: "Flow", code: "x", type: "sequence" });
      expect(mockPrisma.diagram.create).toHaveBeenCalledWith({
        data: { userId: "user-1", title: "Flow", code: "x", type: "sequence" },
      });
    });
  });

  describe("findOne", () => {
    it("throws NotFoundException when missing", async () => {
      mockPrisma.diagram.findUnique.mockResolvedValue(null);
      await expect(service.findOne("diagram-1", "user-1")).rejects.toBeInstanceOf(NotFoundException);
    });

    it("throws ForbiddenException for another user's diagram", async () => {
      mockPrisma.diagram.findUnique.mockResolvedValue({ ...diagram, userId: "other-user" });
      await expect(service.findOne("diagram-1", "user-1")).rejects.toBeInstanceOf(ForbiddenException);
    });

    it("returns an owned diagram", async () => {
      mockPrisma.diagram.findUnique.mockResolvedValue(diagram);
      await expect(service.findOne("diagram-1", "user-1")).resolves.toEqual(diagram);
    });
  });

  describe("update / remove", () => {
    it("updates only the provided fields", async () => {
      mockPrisma.diagram.findUnique.mockResolvedValue(diagram);
      mockPrisma.diagram.update.mockResolvedValue({ ...diagram, code: "new" });
      await service.update("diagram-1", "user-1", { code: "new" });
      expect(mockPrisma.diagram.update).toHaveBeenCalledWith({
        where: { id: "diagram-1" },
        data: { code: "new" },
      });
    });

    it("deletes an owned diagram", async () => {
      mockPrisma.diagram.findUnique.mockResolvedValue(diagram);
      mockPrisma.diagram.delete.mockResolvedValue(diagram);
      await service.remove("diagram-1", "user-1");
      expect(mockPrisma.diagram.delete).toHaveBeenCalledWith({ where: { id: "diagram-1" } });
    });

    it("rejects updating another user's diagram", async () => {
      mockPrisma.diagram.findUnique.mockResolvedValue({ ...diagram, userId: "other-user" });
      await expect(service.update("diagram-1", "user-1", { code: "new" })).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      expect(mockPrisma.diagram.update).not.toHaveBeenCalled();
    });
  });
});
