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
import { RateLimitGuard } from "../common/rate-limit.guard";
import { parseLimit } from "../common/pagination";
import { PagesService } from "./pages.service";
import { AddPageMemberDto, CreatePageDto, UpdatePageDto } from "./dto/pages.dto";
import { CreatePostDto } from "../social/dto/social.dto";

type AuthUser = { user: { userId: string; role?: string } };

@Controller("pages")
export class PagesController {
  constructor(private pages: PagesService) {}

  @Post()
  @UseGuards(AuthGuard("jwt"), RateLimitGuard)
  create(@Req() req: AuthUser, @Body() dto: CreatePageDto) {
    return this.pages.create(req.user.userId, dto);
  }

  @Get()
  @UseGuards(OptionalJwtGuard)
  list(
    @Req() req: AuthUser,
    @Query("cursor") cursor?: string,
    @Query("limit") limit?: string,
    @Query("category") category?: string,
    @Query("q") q?: string
  ) {
    return this.pages.list(
      req.user?.userId,
      cursor || undefined,
      limit ? parseLimit(limit, 20) : undefined,
      category?.trim() || undefined,
      q?.trim() || undefined
    );
  }

  /** Declared before :id so a username lookup is not captured as an id. */
  @Get("username/:username")
  @UseGuards(OptionalJwtGuard)
  findByUsername(@Req() req: AuthUser, @Param("username") username: string) {
    return this.pages.findOne(username, req.user?.userId, true);
  }

  @Get(":id")
  @UseGuards(OptionalJwtGuard)
  findOne(@Req() req: AuthUser, @Param("id") id: string) {
    return this.pages.findOne(id, req.user?.userId);
  }

  @Patch(":id")
  @UseGuards(AuthGuard("jwt"))
  update(@Req() req: AuthUser, @Param("id") id: string, @Body() dto: UpdatePageDto) {
    return this.pages.update(id, req.user.userId, dto);
  }

  @Delete(":id")
  @UseGuards(AuthGuard("jwt"))
  remove(@Req() req: AuthUser, @Param("id") id: string) {
    return this.pages.remove(id, req.user.userId, req.user.role);
  }

  @Get(":id/members")
  @UseGuards(OptionalJwtGuard)
  members(@Param("id") id: string) {
    return this.pages.listMembers(id);
  }

  @Post(":id/members")
  @UseGuards(AuthGuard("jwt"))
  addMember(@Req() req: AuthUser, @Param("id") id: string, @Body() dto: AddPageMemberDto) {
    return this.pages.addMember(id, req.user.userId, dto.userId, dto.role);
  }

  @Delete(":id/members/:userId")
  @UseGuards(AuthGuard("jwt"))
  removeMember(
    @Req() req: AuthUser,
    @Param("id") id: string,
    @Param("userId") userId: string
  ) {
    return this.pages.removeMember(id, req.user.userId, userId);
  }

  @Post(":id/follow")
  @UseGuards(AuthGuard("jwt"), RateLimitGuard)
  follow(@Req() req: AuthUser, @Param("id") id: string) {
    return this.pages.follow(id, req.user.userId);
  }

  @Delete(":id/follow")
  @UseGuards(AuthGuard("jwt"))
  unfollow(@Req() req: AuthUser, @Param("id") id: string) {
    return this.pages.unfollow(id, req.user.userId);
  }

  @Get(":id/followers")
  followers(
    @Param("id") id: string,
    @Query("cursor") cursor?: string,
    @Query("limit") limit?: string
  ) {
    return this.pages.followers(id, cursor || undefined, limit ? parseLimit(limit, 20) : undefined);
  }

  @Get(":id/posts")
  @UseGuards(OptionalJwtGuard)
  posts(
    @Req() req: AuthUser,
    @Param("id") id: string,
    @Query("cursor") cursor?: string,
    @Query("limit") limit?: string
  ) {
    return this.pages.pagePosts(
      id,
      req.user?.userId,
      cursor || undefined,
      limit ? parseLimit(limit, 10) : undefined
    );
  }

  @Post(":id/posts")
  @UseGuards(AuthGuard("jwt"))
  createPost(
    @Req() req: AuthUser,
    @Param("id") id: string,
    @Body() dto: CreatePostDto
  ) {
    return this.pages.createPagePost(id, req.user.userId, dto);
  }

  @Patch(":id/posts/:postId/pin")
  @UseGuards(AuthGuard("jwt"))
  setPostPinned(
    @Req() req: AuthUser,
    @Param("id") id: string,
    @Param("postId") postId: string,
    @Body() body: { pinned: boolean }
  ) {
    return this.pages.setPostPinned(id, postId, req.user.userId, Boolean(body?.pinned));
  }

  /** Customer opens (or resumes) a chat with the page. */
  @Post(":id/messages")
  @UseGuards(AuthGuard("jwt"))
  openThread(@Req() req: AuthUser, @Param("id") id: string) {
    return this.pages.getOrCreateThread(id, req.user.userId);
  }

  @Get(":id/products")
  products(@Param("id") id: string) {
    return this.pages.pageProducts(id);
  }

  @Get(":id/insights")
  @UseGuards(AuthGuard("jwt"))
  insights(@Req() req: AuthUser, @Param("id") id: string) {
    return this.pages.insights(id, req.user.userId);
  }

  @Post(":id/posts/:postId/boost")
  @UseGuards(AuthGuard("jwt"), RateLimitGuard)
  boost(
    @Req() req: AuthUser,
    @Param("id") id: string,
    @Param("postId") postId: string
  ) {
    return this.pages.boostPost(id, postId, req.user.userId);
  }
}
