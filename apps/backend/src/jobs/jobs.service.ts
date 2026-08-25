import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { NotificationsService } from "../social/notifications.service";
import type { Job, JobType, JobStatus } from "@theo/database";
import { CreateJobDto } from "./dto/create-job.dto";
import { UpdateJobDto } from "./dto/update-job.dto";
import { ApplyJobDto } from "./dto/apply-job.dto";

type JobFilters = {
  q?: string;
  location?: string;
  type?: JobType;
  status?: JobStatus;
};

@Injectable()
export class JobsService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService
  ) {}

  async create(dto: CreateJobDto, userId: string): Promise<Job> {
    const job = await this.prisma.job.create({
      data: { ...dto, postedById: userId },
    });

    // Job alert: notify users who previously applied to jobs of the same type.
    if (dto.type) {
      const pastApps = await this.prisma.jobApplication.findMany({
        where: { job: { type: dto.type } },
        select: { applicantId: true },
        distinct: ["applicantId"],
      });
      const recipients = pastApps
        .map((a) => a.applicantId)
        .filter((id) => id !== userId);
      await Promise.all(
        recipients.map((id) =>
          this.notifications.notify({
            userId: id,
            actorId: userId,
            kind: "JOB_ALERT",
            entityId: job.id,
            message: `${job.title} · ${job.company}`,
          })
        )
      );
    }

    return job;
  }

  async findAll(filters: JobFilters): Promise<Job[]> {
    const where: Record<string, unknown> = {
      status: filters.status ?? "OPEN",
    };
    if (filters.type) where.type = filters.type;
    if (filters.location) {
      where.location = { contains: filters.location };
    }
    if (filters.q) {
      where.OR = [
        { title: { contains: filters.q } },
        { company: { contains: filters.q } },
        { description: { contains: filters.q } },
      ];
    }
    return this.prisma.job.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: { postedBy: { select: { id: true, name: true, image: true } } },
    });
  }

  async findOne(id: string): Promise<Job> {
    const job = await this.prisma.job.findUnique({
      where: { id },
      include: { postedBy: { select: { id: true, name: true, image: true } } },
    });
    if (!job) throw new NotFoundException("Job not found");
    return job;
  }

  async update(
    id: string,
    userId: string,
    role: string | undefined,
    dto: UpdateJobDto
  ): Promise<Job> {
    const job = await this.prisma.job.findUnique({ where: { id } });
    if (!job) throw new NotFoundException("Job not found");
    if (job.postedById !== userId && role !== "ADMIN") {
      throw new ForbiddenException("Not allowed to edit this job");
    }
    return this.prisma.job.update({ where: { id }, data: dto });
  }

  async remove(id: string, userId: string, role: string | undefined): Promise<Job> {
    const job = await this.prisma.job.findUnique({ where: { id } });
    if (!job) throw new NotFoundException("Job not found");
    if (job.postedById !== userId && role !== "ADMIN") {
      throw new ForbiddenException("Not allowed to delete this job");
    }
    return this.prisma.job.delete({ where: { id } });
  }

  async apply(
    jobId: string,
    userId: string,
    dto: ApplyJobDto
  ) {
    const job = await this.prisma.job.findUnique({ where: { id: jobId } });
    if (!job) throw new NotFoundException("Job not found");
    if (job.status !== "OPEN") {
      throw new BadRequestException("This job is no longer accepting applications");
    }
    if (job.postedById === userId) {
      throw new BadRequestException("You cannot apply to your own job");
    }

    const existing = await this.prisma.jobApplication.findUnique({
      where: { jobId_applicantId: { jobId, applicantId: userId } },
    });
    if (existing) {
      throw new ConflictException("You have already applied to this job");
    }

    return this.prisma.jobApplication.create({
      data: {
        jobId,
        applicantId: userId,
        coverLetter: dto.coverLetter,
        resumeId: dto.resumeId,
      },
      include: {
        applicant: { select: { id: true, name: true, image: true } },
      },
    });
  }

  async listApplicants(
    jobId: string,
    userId: string,
    role: string | undefined
  ) {
    const job = await this.prisma.job.findUnique({ where: { id: jobId } });
    if (!job) throw new NotFoundException("Job not found");
    if (job.postedById !== userId && role !== "ADMIN") {
      throw new ForbiddenException("Not allowed to view applicants");
    }
    return this.prisma.jobApplication.findMany({
      where: { jobId },
      orderBy: { createdAt: "desc" },
      include: {
        applicant: { select: { id: true, name: true, image: true } },
      },
    });
  }

  myApplications(userId: string) {
    return this.prisma.jobApplication.findMany({
      where: { applicantId: userId },
      orderBy: { createdAt: "desc" },
      include: { job: true },
    });
  }
}
