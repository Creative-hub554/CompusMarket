import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Req, Query } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { NotesService } from "./notes.service";
import { CreateNoteDto } from "./dto/create-note.dto";
import { UpdateNoteDto } from "./dto/update-note.dto";

@Controller("notes")
@UseGuards(AuthGuard("jwt"))
export class NotesController {
  constructor(private readonly notesService: NotesService) {}

  @Post()
  create(@Req() req: { user: { userId: string } }, @Body() body: CreateNoteDto) {
    return this.notesService.create(req.user.userId, body);
  }

  @Get()
  findAll(@Req() req: { user: { userId: string } }, @Query("search") search?: string) {
    return this.notesService.findByUser(req.user.userId, search);
  }

  @Get(":id")
  findOne(@Req() req: { user: { userId: string } }, @Param("id") id: string) {
    return this.notesService.findOne(id, req.user.userId);
  }

  @Patch(":id")
  update(@Req() req: { user: { userId: string } }, @Param("id") id: string, @Body() body: UpdateNoteDto) {
    return this.notesService.update(id, req.user.userId, body);
  }

  @Delete(":id")
  remove(@Req() req: { user: { userId: string } }, @Param("id") id: string) {
    return this.notesService.remove(id, req.user.userId);
  }
}
