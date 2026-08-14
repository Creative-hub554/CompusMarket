import { Test, TestingModule } from "@nestjs/testing";
import { WarrantiesService } from "./warranties.service";
import { PrismaService } from "../prisma/prisma.service";
import { BadRequestException } from "@nestjs/common";
import { WarrantyStatus, WarrantyClaimStatus } from "@theo/database";

describe("WarrantiesService", () => {
  let service: WarrantiesService;

  const mockPrisma = {
    warranty: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      create: vi.fn(),
      count: vi.fn(),
    },
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [WarrantiesService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();
    service = module.get<WarrantiesService>(WarrantiesService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("rejectClaim", () => {
    it("reverts to ACTIVE when still within the coverage window", async () => {
      mockPrisma.warranty.findUnique.mockResolvedValue({
        id: "w-1",
        claimStatus: WarrantyClaimStatus.PENDING,
        endDate: new Date(Date.now() + 86400000),
      });
      mockPrisma.warranty.update.mockResolvedValue({});

      await service.rejectClaim("w-1");

      expect(mockPrisma.warranty.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "w-1" },
          data: { claimStatus: WarrantyClaimStatus.REJECTED, status: WarrantyStatus.ACTIVE },
        }),
      );
    });

    it("reverts to EXPIRED when the coverage window has passed", async () => {
      mockPrisma.warranty.findUnique.mockResolvedValue({
        id: "w-1",
        claimStatus: WarrantyClaimStatus.PENDING,
        endDate: new Date(Date.now() - 86400000),
      });
      mockPrisma.warranty.update.mockResolvedValue({});

      await service.rejectClaim("w-1");

      expect(mockPrisma.warranty.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "w-1" },
          data: { claimStatus: WarrantyClaimStatus.REJECTED, status: WarrantyStatus.EXPIRED },
        }),
      );
    });

    it("rejects when the claim is not pending", async () => {
      mockPrisma.warranty.findUnique.mockResolvedValue({
        id: "w-1",
        claimStatus: WarrantyClaimStatus.APPROVED,
        endDate: new Date(Date.now() + 86400000),
      });

      await expect(service.rejectClaim("w-1")).rejects.toBeInstanceOf(BadRequestException);
    });
  });
});
