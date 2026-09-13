import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Query } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { NotesService } from "./notes.service";
import { CreateNoteDto } from "./dto/create-note.dto";
import { UpdateNoteDto } from "./dto/update-note.dto";
import { CurrentUserId } from "../common/current-user.decorator";

@Controller("notes")
@UseGuards(AuthGuard("jwt"))
export class NotesController {
  constructor(private readonly notesService: NotesService) {}

  @Post()
  create(@CurrentUserId() userId: string, @Body() body: CreateNoteDto) {
    return this.notesService.create(userId, body);
  }

  @Get()
  findAll(@CurrentUserId() userId: string, @Query("search") search?: string) {
    return this.notesService.findByUser(userId, search);
  }

  @Get(":id")
  findOne(@CurrentUserId() userId: string, @Param("id") id: string) {
    return this.notesService.findOne(id, userId);
  }

  @Patch(":id")
  update(@CurrentUserId() userId: string, @Param("id") id: string, @Body() body: UpdateNoteDto) {
    return this.notesService.update(id, userId, body);
  }

  @Delete(":id")
  remove(@CurrentUserId() userId: string, @Param("id") id: string) {
    return this.notesService.remove(id, userId);
  }
}
