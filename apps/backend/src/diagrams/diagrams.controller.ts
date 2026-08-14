import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Req } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { DiagramsService } from "./diagrams.service";
import { CreateDiagramDto } from "./dto/create-diagram.dto";
import { UpdateDiagramDto } from "./dto/update-diagram.dto";

@Controller("diagrams")
@UseGuards(AuthGuard("jwt"))
export class DiagramsController {
  constructor(private readonly diagramsService: DiagramsService) {}

  @Post()
  create(@Req() req: { user: { userId: string } }, @Body() body: CreateDiagramDto) {
    return this.diagramsService.create(req.user.userId, body);
  }

  @Get()
  findAll(@Req() req: { user: { userId: string } }) {
    return this.diagramsService.findByUser(req.user.userId);
  }

  @Get(":id")
  findOne(@Req() req: { user: { userId: string } }, @Param("id") id: string) {
    return this.diagramsService.findOne(id, req.user.userId);
  }

  @Patch(":id")
  update(@Req() req: { user: { userId: string } }, @Param("id") id: string, @Body() body: UpdateDiagramDto) {
    return this.diagramsService.update(id, req.user.userId, body);
  }

  @Delete(":id")
  remove(@Req() req: { user: { userId: string } }, @Param("id") id: string) {
    return this.diagramsService.remove(id, req.user.userId);
  }
}
