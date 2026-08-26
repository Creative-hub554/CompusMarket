import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from "@nestjs/common";import { PrismaService } from "../prisma/prisma.service";
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

    // Job alert recipients: explicit saved-search alerts + past applicants
    // of the same job type. Deduped; the poster never notifies themselves.
    const recipients = new Set<string>();

    const alerts = await this.prisma.jobAlert.findMany({
      where: {
        userId: { not: userId },
        OR: [{ type: null }, { type: dto.type }],
      },
      select: { userId: true, location: true, q: true },
    });
    for (const alert of alerts) {
      if (
        alert.location &&
        !(job.location || "").toLowerCase().includes(alert.location.toLowerCase())
      )
        continue;
      if (alert.q) {
        const haystack = `${job.title} ${job.company} ${job.description}`.toLowerCase();
        if (!haystack.includes(alert.q.toLowerCase())) continue;
      }
      recipients.add(alert.userId);
    }

    const pastApps = await this.prisma.jobApplication.findMany({
      where: { job: { type: dto.type } },
      select: { applicantId: true },
      distinct: ["applicantId"],
    });
    for (const app of pastApps) recipients.add(app.applicantId);
    recipients.delete(userId);

    await Promise.all(
      [...recipients].map((id) =>
        this.notifications.notify({
          userId: id,
          actorId: userId,
          kind: "JOB_ALERT",
          entityId: job.id,
          message: `${job.title} · ${job.company}`,
        })
      )
    );

    return job;
  }

  listAlerts(userId: string) {
    return this.prisma.jobAlert.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
  }

  async createAlert(
    userId: string,
    dto: { type?: JobType; location?: string; q?: string }
  ) {
    const type = dto.type || null;
    const location = dto.location?.trim() || null;
    const q = dto.q?.trim() || null;
    if (!type && !location && !q) {
      throw new BadRequestException(
        "An alert needs at least one of type, location or keyword"
      );
    }
    const dupe = await this.prisma.jobAlert.findFirst({
      where: { userId, type, location, q },
    });
    if (dupe) return dupe;
    return this.prisma.jobAlert.create({
      data: { userId, type, location, q },
    });
  }

  async removeAlert(userId: string, alertId: string) {
    const alert = await this.prisma.jobAlert.findUnique({
      where: { id: alertId },
    });
    if (!alert || alert.userId !== userId) {
      throw new NotFoundException("Alert not found");
    }
    await this.prisma.jobAlert.delete({ where: { id: alertId } });
    return { removed: alertId };
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
      take: 100,
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
      take: 200,
      include: {
        applicant: { select: { id: true, name: true, image: true } },
      },
    });
  }

  myApplications(userId: string) {
    return this.prisma.jobApplication.findMany({
      where: { applicantId: userId },
      orderBy: { createdAt: "desc" },
      take: 100,
      include: { job: true },
    });
  }
}
