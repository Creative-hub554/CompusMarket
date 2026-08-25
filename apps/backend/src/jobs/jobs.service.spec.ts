import { Test, TestingModule } from "@nestjs/testing";
import { JobsService } from "./jobs.service";
import { PrismaService } from "../prisma/prisma.service";
import { NotificationsService } from "../social/notifications.service";
import { ForbiddenException, ConflictException, BadRequestException } from "@nestjs/common";

describe("JobsService", () => {
  let service: JobsService;

  const mockPrisma = {
    job: {
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    jobApplication: {
      findUnique: vi.fn(),
      create: vi.fn(),
      findMany: vi.fn(),
    },
    jobAlert: {
      findMany: vi.fn(),
    },
  };

  const mockNotifications = {
    notify: vi.fn().mockResolvedValue({}),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    mockNotifications.notify.mockResolvedValue({});
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JobsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: NotificationsService, useValue: mockNotifications },
      ],
    }).compile();
    service = module.get<JobsService>(JobsService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("create", () => {
    it("sets the poster as postedById", async () => {
      mockPrisma.job.create.mockResolvedValue({ id: "j1" });
      mockPrisma.jobAlert.findMany.mockResolvedValue([]);
      mockPrisma.jobApplication.findMany.mockResolvedValue([]);
      await service.create(
        { title: "Dev", company: "Acme", location: "PP", type: "FULL_TIME", description: "d" },
        "u1"
      );
      expect(mockPrisma.job.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ postedById: "u1" }),
      });
    });

    it("alerts past applicants of the same job type (excluding the poster)", async () => {
      mockPrisma.job.create.mockResolvedValue({
        id: "j2",
        title: "Barista",
        company: "Coffee KH",
      });
      mockPrisma.jobAlert.findMany.mockResolvedValue([]);
      mockPrisma.jobApplication.findMany.mockResolvedValue([
        { applicantId: "u1" },
        { applicantId: "u2" },
      ]);

      await service.create(
        { title: "Barista", company: "Coffee KH", location: "PP", type: "PART_TIME", description: "d" },
        "u1"
      );

      expect(mockPrisma.jobApplication.findMany).toHaveBeenCalledWith({
        where: { job: { type: "PART_TIME" } },
        select: { applicantId: true },
        distinct: ["applicantId"],
      });
      expect(mockNotifications.notify).toHaveBeenCalledTimes(1);
      expect(mockNotifications.notify).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: "u2",
          kind: "JOB_ALERT",
          entityId: "j2",
          message: "Barista · Coffee KH",
        })
      );
    });
  });

  describe("findAll", () => {
    it("defaults status to OPEN and applies type/location/q filters", async () => {
      mockPrisma.job.findMany.mockResolvedValue([]);
      await service.findAll({ type: "REMOTE", location: "PP", q: "dev" });
      const where = mockPrisma.job.findMany.mock.calls[0][0].where;
      expect(where.status).toBe("OPEN");
      expect(where.type).toBe("REMOTE");
      expect(where.location).toEqual({ contains: "PP" });
      expect(where.OR).toBeDefined();
    });
  });

  describe("update", () => {
    it("throws Forbidden when a non-owner non-admin edits", async () => {
      mockPrisma.job.findUnique.mockResolvedValue({ id: "j1", postedById: "u2" });
      await expect(
        service.update("j1", "u1", undefined, { title: "x" })
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe("apply", () => {
    it("creates an application for an open job", async () => {
      mockPrisma.job.findUnique.mockResolvedValue({
        id: "j1",
        status: "OPEN",
        postedById: "owner",
      });
      mockPrisma.jobApplication.findUnique.mockResolvedValue(null);
      mockPrisma.jobApplication.create.mockResolvedValue({ id: "a1" });

      await service.apply("j1", "u1", { coverLetter: "hi" });

      expect(mockPrisma.jobApplication.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ jobId: "j1", applicantId: "u1" }),
        include: expect.any(Object),
      });
    });

    it("throws Conflict when already applied", async () => {
      mockPrisma.job.findUnique.mockResolvedValue({
        id: "j1",
        status: "OPEN",
        postedById: "owner",
      });
      mockPrisma.jobApplication.findUnique.mockResolvedValue({ id: "a1" });

      await expect(service.apply("j1", "u1", {})).rejects.toThrow(ConflictException);
    });

    it("throws BadRequest when applying to a closed job", async () => {
      mockPrisma.job.findUnique.mockResolvedValue({
        id: "j1",
        status: "CLOSED",
        postedById: "owner",
      });
      await expect(service.apply("j1", "u1", {})).rejects.toThrow(BadRequestException);
    });
  });
});
