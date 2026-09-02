import { Injectable, ConflictException, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  async create(reporterId: string, data: {
    targetType: "POST" | "PRODUCT" | "USER" | "COMMENT";
    targetId: string;
    reason: "SPAM" | "ABUSE" | "FRAUD" | "INAPPROPRIATE" | "OTHER";
    message?: string;
  }) {
    const existing = await this.prisma.report.findUnique({
      where: {
        targetType_targetId_reporterId: {
          targetType: data.targetType,
          targetId: data.targetId,
          reporterId,
        },
      },
    });
    if (existing) {
      throw new ConflictException("You have already reported this item");
    }

    return this.prisma.report.create({
      data: {
        reporterId,
        targetType: data.targetType,
        targetId: data.targetId,
        reason: data.reason,
        message: data.message,
      },
    });
  }

  async list(status?: string) {
    const where = status
      ? { status: status as "PENDING" | "REVIEWED" | "DISMISSED" }
      : {};
    return this.prisma.report.findMany({
      where,
      include: { reporter: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: "desc" },
      take: 200,
    });
  }

  async updateStatus(
    id: string,
    status: "PENDING" | "REVIEWED" | "DISMISSED",
    adminNotes?: string,
    reviewedBy?: string,
  ) {
    const report = await this.prisma.report.findUnique({ where: { id } });
    if (!report) throw new NotFoundException("Report not found");

    return this.prisma.report.update({
      where: { id },
      data: { status, adminNotes, reviewedBy },
    });
  }
}