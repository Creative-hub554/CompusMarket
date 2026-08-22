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
import { PostsService } from "./posts.service";
import { FollowsService } from "./follows.service";
import { StoriesService } from "./stories.service";
import { ProfilesService } from "./profiles.service";
import { NotificationsService } from "./notifications.service";
import {
  CreateCommentDto,
  CreatePostDto,
  CreateStoryDto,
  ReactDto,
  UpdatePostDto,
  UpdateProfileDto,
} from "./dto/social.dto";

type AuthUser = { user: { userId: string; role?: string } };

@Controller()
export class SocialController {
  constructor(
    private posts: PostsService,
    private follows: FollowsService,
    private stories: StoriesService,
    private profiles: ProfilesService,
    private notifications: NotificationsService
  ) {}

  // ── Posts & feed ──

  @Post("posts")
  @UseGuards(AuthGuard("jwt"))
  createPost(@Req() req: AuthUser, @Body() dto: CreatePostDto) {
    return this.posts.create(req.user.userId, dto);
  }

  @Get("feed")
  @UseGuards(AuthGuard("jwt"))
  feed(@Req() req: AuthUser, @Query("cursor") cursor?: string, @Query("limit") limit?: string) {
    return this.posts.feed(req.user.userId, cursor, limit ? parseInt(limit) : undefined);
  }

  @Get("posts/:id")
  @UseGuards(OptionalJwtGuard)
  getPost(@Req() req: AuthUser, @Param("id") id: string) {
    return this.posts.findOne(id, req.user?.userId);
  }

  @Patch("posts/:id")
  @UseGuards(AuthGuard("jwt"))
  updatePost(
    @Req() req: AuthUser,
    @Param("id") id: string,
    @Body() dto: UpdatePostDto
  ) {
    return this.posts.update(id, req.user.userId, dto.content);
  }

  @Delete("posts/:id")
  @UseGuards(AuthGuard("jwt"))
  deletePost(@Req() req: AuthUser, @Param("id") id: string) {
    return this.posts.remove(id, req.user.userId, req.user.role);
  }

  @Post("posts/:id/react")
  @UseGuards(AuthGuard("jwt"))
  react(@Req() req: AuthUser, @Param("id") id: string, @Body() dto: ReactDto) {
    return this.posts.react(req.user.userId, id, dto.emoji);
  }

  @Get("posts/:id/comments")
  @UseGuards(OptionalJwtGuard)
  listComments(@Param("id") id: string) {
    return this.posts.listComments(id);
  }

  @Post("posts/:id/comments")
  @UseGuards(AuthGuard("jwt"))
  comment(@Req() req: AuthUser, @Param("id") id: string, @Body() dto: CreateCommentDto) {
    return this.posts.comment(req.user.userId, id, dto);
  }

  @Delete("comments/:id")
  @UseGuards(AuthGuard("jwt"))
  deleteComment(@Req() req: AuthUser, @Param("id") id: string) {
    return this.posts.removeComment(id, req.user.userId, req.user.role);
  }

  // ── Profiles ──

  @Patch("profiles/me")
  @UseGuards(AuthGuard("jwt"))
  updateMe(@Req() req: AuthUser, @Body() dto: UpdateProfileDto) {
    return this.profiles.updateMe(req.user.userId, dto);
  }

  @Get("profiles/username/:username")
  @UseGuards(OptionalJwtGuard)
  getProfileByUsername(@Req() req: AuthUser, @Param("username") username: string) {
    return this.profiles.getProfileByUsername(username, req.user?.userId);
  }

  @Get("profiles/:id")
  @UseGuards(OptionalJwtGuard)
  getProfile(@Req() req: AuthUser, @Param("id") id: string) {
    return this.profiles.getProfile(id, req.user?.userId);
  }

  @Get("profiles/:id/posts")
  @UseGuards(OptionalJwtGuard)
  getProfilePosts(
    @Req() req: AuthUser,
    @Param("id") id: string,
    @Query("cursor") cursor?: string,
    @Query("limit") limit?: string
  ) {
    return this.posts.byAuthor(id, req.user?.userId, cursor, limit ? parseInt(limit) : undefined);
  }

  // ── Follows ──

  @Post("users/:id/follow")
  @UseGuards(AuthGuard("jwt"))
  follow(@Req() req: AuthUser, @Param("id") id: string) {
    return this.follows.follow(req.user.userId, id);
  }

  @Delete("users/:id/follow")
  @UseGuards(AuthGuard("jwt"))
  unfollow(@Req() req: AuthUser, @Param("id") id: string) {
    return this.follows.unfollow(req.user.userId, id);
  }

  @Get("users/:id/followers")
  followers(@Param("id") id: string) {
    return this.follows.followers(id);
  }

  @Get("users/:id/following")
  following(@Param("id") id: string) {
    return this.follows.following(id);
  }

  @Get("suggestions")
  @UseGuards(AuthGuard("jwt"))
  suggestions(@Req() req: AuthUser) {
    return this.follows.suggestions(req.user.userId);
  }

  // ── Stories ──

  @Post("stories")
  @UseGuards(AuthGuard("jwt"))
  createStory(@Req() req: AuthUser, @Body() dto: CreateStoryDto) {
    return this.stories.create(req.user.userId, dto);
  }

  @Get("stories")
  @UseGuards(AuthGuard("jwt"))
  storyFeed(@Req() req: AuthUser) {
    return this.stories.feedForViewer(req.user.userId);
  }

  @Post("stories/:id/view")
  @UseGuards(AuthGuard("jwt"))
  viewStory(@Req() req: AuthUser, @Param("id") id: string) {
    return this.stories.view(id, req.user.userId);
  }

  @Delete("stories/:id")
  @UseGuards(AuthGuard("jwt"))
  deleteStory(@Req() req: AuthUser, @Param("id") id: string) {
    return this.stories.remove(id, req.user.userId, req.user.role);
  }

  // ── Notifications ──

  @Get("notifications")
  @UseGuards(AuthGuard("jwt"))
  listNotifications(@Req() req: AuthUser) {
    return this.notifications.list(req.user.userId);
  }

  @Get("notifications/unread-count")
  @UseGuards(AuthGuard("jwt"))
  getUnreadCount(@Req() req: AuthUser) {
    return this.notifications.unreadCount(req.user.userId);
  }

  @Post("notifications/mark-read")
  @UseGuards(AuthGuard("jwt"))
  markNotificationsRead(@Req() req: AuthUser, @Body() body: { id?: string }) {
    return this.notifications.markRead(req.user.userId, body.id);
  }
}
