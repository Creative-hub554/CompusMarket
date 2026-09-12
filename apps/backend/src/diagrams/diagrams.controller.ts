import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { DiagramsService } from "./diagrams.service";
import { CreateDiagramDto } from "./dto/create-diagram.dto";
import { UpdateDiagramDto } from "./dto/update-diagram.dto";
import { CurrentUserId } from "../common/current-user.decorator";

@Controller("diagrams")
@UseGuards(AuthGuard("jwt"))
export class DiagramsController {
  constructor(private readonly diagramsService: DiagramsService) {}

  @Post()
  create(@CurrentUserId() userId: string, @Body() body: CreateDiagramDto) {
    return this.diagramsService.create(userId, body);
  }

  @Get()
  findAll(@CurrentUserId() userId: string) {
    return this.diagramsService.findByUser(userId);
  }

  @Get(":id")
  findOne(@CurrentUserId() userId: string, @Param("id") id: string) {
    return this.diagramsService.findOne(id, userId);
  }

  @Patch(":id")
  update(@CurrentUserId() userId: string, @Param("id") id: string, @Body() body: UpdateDiagramDto) {
    return this.diagramsService.update(id, userId, body);
  }

  @Delete(":id")
  remove(@CurrentUserId() userId: string, @Param("id") id: string) {
    return this.diagramsService.remove(id, userId);
  }
}
