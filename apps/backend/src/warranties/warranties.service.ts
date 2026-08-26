import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { WarrantyStatus, WarrantyClaimStatus } from "@theo/database";
import { CreateWarrantyDto } from "./dto/create-warranty.dto";
import { ClaimWarrantyDto } from "./dto/claim-warranty.dto";

@Injectable()
export class WarrantiesService {
  constructor(private prisma: PrismaService) {}
  async create(dto: CreateWarrantyDto) {
    const startDate = new Date(dto.startDate);
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + dto.months);

    return this.prisma.warranty.create({
      data: {
        orderItemId: dto.orderItemId,
        productId: dto.productId,
        userId: dto.userId,
        months: dto.months,
        startDate,
        endDate,
      },
      include: {
        product: { select: { name: true } },
        orderItem: { select: { price: true } },
      },
    });
  }

  async findAll() {
    return this.prisma.warranty.findMany({
      include: {
        product: { select: { name: true, images: true } },
        user: { select: { name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    });
  }

  async findOne(id: string, user?: { userId: string; role?: string }) {
    const warranty = await this.prisma.warranty.findUnique({
      where: { id },
      include: {
        product: true,
        user: { select: { name: true, email: true } },
        orderItem: { include: { order: true } },
      },
    });
    if (!warranty) throw new NotFoundException("Warranty not found");
    // IDOR protection: non-admins may only view their own warranties.
    if (user && user.role !== "ADMIN" && warranty.userId !== user.userId) {
      throw new ForbiddenException("You do not have access to this warranty");
    }
    return warranty;
  }

  async findByUser(userId: string) {
    return this.prisma.warranty.findMany({
      where: { userId },
      include: {
        product: { select: { name: true, images: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
  }

  async findByProduct(productId: string) {
    return this.prisma.warranty.findMany({
      where: { productId },
      include: {
        user: { select: { name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
  }

  async claim(id: string, userId: string, dto: ClaimWarrantyDto) {
    const warranty = await this.findOne(id);

    if (warranty.userId !== userId) {
      throw new BadRequestException("This warranty does not belong to you");
    }

    if (warranty.status !== WarrantyStatus.ACTIVE) {
      throw new BadRequestException("Warranty is not active");
    }

    if (new Date() > warranty.endDate) {
      await this.prisma.warranty.updateMany({
        where: { id, status: WarrantyStatus.ACTIVE },
        data: { status: WarrantyStatus.EXPIRED },
      });
      throw new BadRequestException("Warranty has expired");
    }

    const claimed = await this.prisma.warranty.updateMany({
      where: { id, userId, status: WarrantyStatus.ACTIVE },
      data: {
        status: WarrantyStatus.CLAIMED,
        claimDate: new Date(),
        claimReason: dto.reason,
        claimStatus: WarrantyClaimStatus.PENDING,
      },
    });
    if (claimed.count === 0) {
      throw new BadRequestException("Warranty is not active");
    }

    return this.prisma.warranty.findUnique({
      where: { id },
      include: {
        product: { select: { name: true } },
      },
    });
  }

  async approveClaim(id: string) {
    const warranty = await this.findOne(id);
    if (warranty.claimStatus !== WarrantyClaimStatus.PENDING) {
      throw new BadRequestException("Claim is not pending");
    }
    return this.prisma.warranty.update({
      where: { id },
      data: { claimStatus: WarrantyClaimStatus.APPROVED },
    });
  }

  async rejectClaim(id: string) {
    const warranty = await this.findOne(id);
    if (warranty.claimStatus !== WarrantyClaimStatus.PENDING) {
      throw new BadRequestException("Claim is not pending");
    }
    // Revert to a claimable state so the customer can re-submit if still covered.
    const status =
      new Date() > warranty.endDate ? WarrantyStatus.EXPIRED : WarrantyStatus.ACTIVE;
    return this.prisma.warranty.update({
      where: { id },
      data: { claimStatus: WarrantyClaimStatus.REJECTED, status },
    });
  }

  async updateNotes(id: string, notes: string) {
    await this.findOne(id);
    return this.prisma.warranty.update({
      where: { id },
      data: { notes },
    });
  }

  async getStats() {
    const [total, active, expired, claimed, pendingClaims] = await Promise.all([
      this.prisma.warranty.count(),
      this.prisma.warranty.count({ where: { status: WarrantyStatus.ACTIVE } }),
      this.prisma.warranty.count({ where: { status: WarrantyStatus.EXPIRED } }),
      this.prisma.warranty.count({ where: { status: WarrantyStatus.CLAIMED } }),
      this.prisma.warranty.count({ where: { claimStatus: WarrantyClaimStatus.PENDING } }),
    ]);
    return { total, active, expired, claimed, pendingClaims };
  }
}
