import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Req } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { DocumentsService } from "./documents.service";

@Controller("documents")
@UseGuards(AuthGuard("jwt"))
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Post()
  create(@Req() req: { user: { userId: string } }, @Body() body: { title: string; content?: string; folderId?: string }) {
    return this.documentsService.create(req.user.userId, body);
  }

  @Get()
  findAll(@Req() req: { user: { userId: string } }) {
    return this.documentsService.findByUser(req.user.userId);
  }

  @Get(":id")
  findOne(@Req() req: { user: { userId: string } }, @Param("id") id: string) {
    return this.documentsService.findOne(id, req.user.userId);
  }

  @Patch(":id")
  update(@Req() req: { user: { userId: string } }, @Param("id") id: string, @Body() body: { title?: string; content?: string; folderId?: string | null }) {
    return this.documentsService.update(id, req.user.userId, body);
  }

  @Delete(":id")
  remove(@Req() req: { user: { userId: string } }, @Param("id") id: string) {
    return this.documentsService.remove(id, req.user.userId);
  }

  // Folders
  @Post("folders")
  createFolder(@Req() req: { user: { userId: string } }, @Body() body: { name: string }) {
    return this.documentsService.createFolder(req.user.userId, body.name);
  }

  @Get("folders/all")
  getFolders(@Req() req: { user: { userId: string } }) {
    return this.documentsService.findFolders(req.user.userId);
  }

  @Delete("folders/:id")
  deleteFolder(@Req() req: { user: { userId: string } }, @Param("id") id: string) {
    return this.documentsService.deleteFolder(id, req.user.userId);
  }
}
