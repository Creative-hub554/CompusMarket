import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { ResumesService } from "./resumes.service";
import { CreateResumeDto } from "./dto/create-resume.dto";
import { UpdateResumeDto } from "./dto/update-resume.dto";
import { CurrentUserId } from "../common/current-user.decorator";

@Controller("resumes")
@UseGuards(AuthGuard("jwt"))
export class ResumesController {
  constructor(private readonly resumesService: ResumesService) {}

  @Post()
  create(@CurrentUserId() userId: string, @Body() body: CreateResumeDto) {
    return this.resumesService.create(userId, { title: body.title, data: body.data });
  }

  @Get()
  findAll(@CurrentUserId() userId: string) {
    return this.resumesService.findByUser(userId);
  }

  @Get(":id")
  findOne(@CurrentUserId() userId: string, @Param("id") id: string) {
    return this.resumesService.findOne(id, userId);
  }

  @Patch(":id")
  update(@CurrentUserId() userId: string, @Param("id") id: string, @Body() body: UpdateResumeDto) {
    return this.resumesService.update(id, userId, body);
  }

  @Delete(":id")
  remove(@CurrentUserId() userId: string, @Param("id") id: string) {
    return this.resumesService.remove(id, userId);
  }
}
