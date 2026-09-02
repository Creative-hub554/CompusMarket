import { Controller, Get, Post, Patch, Param, Body, Query, Req, UseGuards } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { SetMetadata } from "@nestjs/common";
import { RolesGuard, ROLES_KEY } from "../auth/roles.guard";
import { RateLimitGuard } from "../common/rate-limit.guard";
import { ReportsService } from "./reports.service";
import { CreateReportDto } from "./dto/create-report.dto";

@Controller("reports")
@UseGuards(new RateLimitGuard(10, 60))
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Post()
  @UseGuards(AuthGuard("jwt"))
  create(@Req() req: { user: { userId: string } }, @Body() body: CreateReportDto) {
    return this.reportsService.create(req.user.userId, body);
  }

  @Get()
  @UseGuards(AuthGuard("jwt"), RolesGuard)
  @SetMetadata(ROLES_KEY, ["ADMIN"])
  list(@Query("status") status?: string) {
    return this.reportsService.list(status);
  }

  @Patch(":id")
  @UseGuards(AuthGuard("jwt"), RolesGuard)
  @SetMetadata(ROLES_KEY, ["ADMIN"])
  updateStatus(
    @Param("id") id: string,
    @Body() body: { status: "PENDING" | "REVIEWED" | "DISMISSED"; adminNotes?: string },
    @Req() req: { user: { userId: string } },
  ) {
    return this.reportsService.updateStatus(id, body.status, body.adminNotes, req.user.userId);
  }
}