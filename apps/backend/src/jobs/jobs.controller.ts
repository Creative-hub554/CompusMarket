import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { JobsService } from "./jobs.service";
import { CreateJobDto } from "./dto/create-job.dto";
import { UpdateJobDto } from "./dto/update-job.dto";
import { ApplyJobDto } from "./dto/apply-job.dto";
import type { JobType, JobStatus } from "@theo/database";

type AuthedReq = { user: { userId: string; role?: string } };

@Controller("jobs")
export class JobsController {
  constructor(private readonly jobsService: JobsService) {}

  @Get("alerts")
  @UseGuards(AuthGuard("jwt"))
  listAlerts(@Req() req: AuthedReq) {
    return this.jobsService.listAlerts(req.user.userId);
  }

  @Post("alerts")
  @UseGuards(AuthGuard("jwt"))
  createAlert(
    @Req() req: AuthedReq,
    @Body() dto: { type?: JobType; location?: string; q?: string }
  ) {
    return this.jobsService.createAlert(req.user.userId, dto);
  }

  @Delete("alerts/:alertId")
  @UseGuards(AuthGuard("jwt"))
  removeAlert(@Req() req: AuthedReq, @Param("alertId") alertId: string) {
    return this.jobsService.removeAlert(req.user.userId, alertId);
  }

  @Post()
  @UseGuards(AuthGuard("jwt"))
  create(@Req() req: AuthedReq, @Body() dto: CreateJobDto) {
    return this.jobsService.create(dto, req.user.userId);
  }

  @Get()
  findAll(
    @Query("q") q?: string,
    @Query("location") location?: string,
    @Query("type") type?: JobType,
    @Query("status") status?: JobStatus
  ) {
    return this.jobsService.findAll({ q, location, type, status });
  }

  @Get("my-applications")
  @UseGuards(AuthGuard("jwt"))
  myApplications(@Req() req: AuthedReq) {
    return this.jobsService.myApplications(req.user.userId);
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.jobsService.findOne(id);
  }

  @Patch(":id")
  @UseGuards(AuthGuard("jwt"))
  update(
    @Req() req: AuthedReq,
    @Param("id") id: string,
    @Body() dto: UpdateJobDto
  ) {
    return this.jobsService.update(id, req.user.userId, req.user.role, dto);
  }

  @Delete(":id")
  @UseGuards(AuthGuard("jwt"))
  remove(@Req() req: AuthedReq, @Param("id") id: string) {
    return this.jobsService.remove(id, req.user.userId, req.user.role);
  }

  @Post(":id/apply")
  @UseGuards(AuthGuard("jwt"))
  apply(
    @Req() req: AuthedReq,
    @Param("id") id: string,
    @Body() dto: ApplyJobDto
  ) {
    return this.jobsService.apply(id, req.user.userId, dto);
  }

  @Get(":id/applicants")
  @UseGuards(AuthGuard("jwt"))
  applicants(@Req() req: AuthedReq, @Param("id") id: string) {
    return this.jobsService.listApplicants(id, req.user.userId, req.user.role);
  }
}
