import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { DocumentsService } from "./documents.service";
import { CreateDocumentDto } from "./dto/create-document.dto";
import { UpdateDocumentDto } from "./dto/update-document.dto";
import { CreateFolderDto } from "./dto/create-folder.dto";
import { CurrentUserId } from "../common/current-user.decorator";

@Controller("documents")
@UseGuards(AuthGuard("jwt"))
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Post()
  create(@CurrentUserId() userId: string, @Body() body: CreateDocumentDto) {
    return this.documentsService.create(userId, body);
  }

  @Get()
  findAll(@CurrentUserId() userId: string) {
    return this.documentsService.findByUser(userId);
  }

  @Get(":id")
  findOne(@CurrentUserId() userId: string, @Param("id") id: string) {
    return this.documentsService.findOne(id, userId);
  }

  @Patch(":id")
  update(@CurrentUserId() userId: string, @Param("id") id: string, @Body() body: UpdateDocumentDto) {
    return this.documentsService.update(id, userId, body);
  }

  @Delete(":id")
  remove(@CurrentUserId() userId: string, @Param("id") id: string) {
    return this.documentsService.remove(id, userId);
  }

  // Folders
  @Post("folders")
  createFolder(@CurrentUserId() userId: string, @Body() body: CreateFolderDto) {
    return this.documentsService.createFolder(userId, body.name);
  }

  @Get("folders/all")
  getFolders(@CurrentUserId() userId: string) {
    return this.documentsService.findFolders(userId);
  }

  @Delete("folders/:id")
  deleteFolder(@CurrentUserId() userId: string, @Param("id") id: string) {
    return this.documentsService.deleteFolder(id, userId);
  }
}
