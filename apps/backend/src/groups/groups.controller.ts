import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { OptionalJwtGuard } from "../auth/optional-jwt.guard";
import { GroupsService } from "./groups.service";
import { CreateGroupDto, UpdateGroupDto } from "./dto/groups.dto";
import { CreatePostDto } from "../social/dto/social.dto";

type AuthUser = { user: { userId: string; role?: string } };

@Controller("groups")
export class GroupsController {
  constructor(private groups: GroupsService) {}

  @Post()
  @UseGuards(AuthGuard("jwt"))
  create(@Req() req: AuthUser, @Body() dto: CreateGroupDto) {
    return this.groups.create(req.user.userId, dto);
  }

  @Get()
  @UseGuards(OptionalJwtGuard)
  list(
    @Req() req: AuthUser,
    @Query("cursor") cursor?: string,
    @Query("limit") limit?: string
  ) {
    return this.groups.list(
      req.user?.userId,
      cursor || undefined,
      limit ? parseInt(limit, 10) : undefined
    );
  }

  @Get(":id")
  @UseGuards(OptionalJwtGuard)
  findOne(@Req() req: AuthUser, @Param("id") id: string) {
    return this.groups.findOne(id, req.user?.userId);
  }

  @Patch(":id")
  @UseGuards(AuthGuard("jwt"))
  update(
    @Req() req: AuthUser,
    @Param("id") id: string,
    @Body() dto: UpdateGroupDto
  ) {
    return this.groups.update(id, req.user.userId, dto);
  }

  @Delete(":id/members/:userId")
  @UseGuards(AuthGuard("jwt"))
  removeMember(
    @Req() req: AuthUser,
    @Param("id") id: string,
    @Param("userId") userId: string
  ) {
    return this.groups.removeMember(id, req.user.userId, userId);
  }

  @Patch(":id/members/:userId")
  @UseGuards(AuthGuard("jwt"))
  setMemberRole(
    @Req() req: AuthUser,
    @Param("id") id: string,
    @Param("userId") userId: string,
    @Body() body: { role: "ADMIN" | "MEMBER" }
  ) {
    return this.groups.setMemberRole(
      id,
      req.user.userId,
      userId,
      body?.role === "ADMIN" ? "ADMIN" : "MEMBER"
    );
  }

  @Delete(":id")
  @UseGuards(AuthGuard("jwt"))
  remove(@Req() req: AuthUser, @Param("id") id: string) {
    return this.groups.remove(id, req.user.userId, req.user.role);
  }

  @Post(":id/join")
  @UseGuards(AuthGuard("jwt"))
  join(@Req() req: AuthUser, @Param("id") id: string) {
    return this.groups.join(id, req.user.userId);
  }

  @Post(":id/leave")
  @UseGuards(AuthGuard("jwt"))
  leave(@Req() req: AuthUser, @Param("id") id: string) {
    return this.groups.leave(id, req.user.userId);
  }

  @Get(":id/posts")
  @UseGuards(OptionalJwtGuard)
  posts(
    @Req() req: AuthUser,
    @Param("id") id: string,
    @Query("cursor") cursor?: string,
    @Query("limit") limit?: string
  ) {
    return this.groups.groupPosts(
      id,
      req.user?.userId,
      cursor || undefined,
      limit ? parseInt(limit, 10) : undefined
    );
  }

  @Post(":id/posts")
  @UseGuards(AuthGuard("jwt"))
  createPost(
    @Req() req: AuthUser,
    @Param("id") id: string,
    @Body() dto: CreatePostDto
  ) {
    return this.groups.createGroupPost(id, req.user.userId, dto);
  }

  @Get(":id/thread")
  @UseGuards(AuthGuard("jwt"))
  thread(@Req() req: AuthUser, @Param("id") id: string) {
    return this.groups.getOrCreateThread(id, req.user.userId);
  }
}
