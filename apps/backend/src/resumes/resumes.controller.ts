import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Req,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { ResumesService } from "./resumes.service";
import { CreateResumeDto } from "./dto/create-resume.dto";
import { UpdateResumeDto } from "./dto/update-resume.dto";

@Controller("resumes")
@UseGuards(AuthGuard("jwt"))
export class ResumesController {
  constructor(private readonly resumesService: ResumesService) {}

  @Post()
  create(
    @Req() req: { user: { userId: string } },
    @Body() body: CreateResumeDto
  ) {
    return this.resumesService.create(req.user.userId, body.title, body.data);
  }

  @Get()
  findAll(@Req() req: { user: { userId: string } }) {
    return this.resumesService.findByUser(req.user.userId);
  }

  @Get(":id")
  findOne(
    @Req() req: { user: { userId: string } },
    @Param("id") id: string
  ) {
    return this.resumesService.findOne(id, req.user.userId);
  }

  @Patch(":id")
  update(
    @Req() req: { user: { userId: string } },
    @Param("id") id: string,
    @Body() body: UpdateResumeDto
  ) {
    return this.resumesService.update(id, req.user.userId, body);
  }

  @Delete(":id")
  remove(
    @Req() req: { user: { userId: string } },
    @Param("id") id: string
  ) {
    return this.resumesService.remove(id, req.user.userId);
  }
}
