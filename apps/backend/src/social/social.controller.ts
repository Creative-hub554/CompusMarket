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
import { parseLimit } from "../common/pagination";
import {
  CreateCommentDto,
  CreatePostDto,
  CreateStoryDto,
  ReactDto,
  UpdatePostDto,
  UpdateProfileDto,
  CreateProfileAlbumDto,
  AddProfileAlbumImageDto,
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
    return this.posts.feed(req.user.userId, cursor, limit ? parseLimit(limit, 10) : undefined);
  }

  /** Declared before posts/:id so "bookmarks" isn't captured as an id. */
  @Get("posts/bookmarks")
  @UseGuards(AuthGuard("jwt"))
  bookmarks(@Req() req: AuthUser, @Query("cursor") cursor?: string, @Query("limit") limit?: string) {
    return this.posts.bookmarksFor(req.user.userId, cursor, limit ? parseLimit(limit, 10) : undefined);
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

  @Post("posts/:id/bookmark")
  @UseGuards(AuthGuard("jwt"))
  toggleBookmark(@Req() req: AuthUser, @Param("id") id: string) {
    return this.posts.toggleBookmark(req.user.userId, id);
  }

  @Get("posts/:id/comments")
  @UseGuards(OptionalJwtGuard)
  listComments(@Req() req: AuthUser, @Param("id") id: string) {
    return this.posts.listComments(id, req.user?.userId);
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

  @Get("profiles/:id/albums")
  @UseGuards(OptionalJwtGuard)
  listAlbums(@Req() req: AuthUser, @Param("id") id: string) {
    return this.profiles.listAlbums(id, req.user?.userId);
  }

  @Post("profiles/me/albums")
  @UseGuards(AuthGuard("jwt"))
  createAlbum(@Req() req: AuthUser, @Body() dto: CreateProfileAlbumDto) {
    return this.profiles.createAlbum(req.user.userId, dto.title, dto.description);
  }

  @Delete("profiles/me/albums/:id")
  @UseGuards(AuthGuard("jwt"))
  deleteAlbum(@Req() req: AuthUser, @Param("id") id: string) {
    return this.profiles.deleteAlbum(req.user.userId, id);
  }

  @Post("profiles/me/albums/:id/images")
  @UseGuards(AuthGuard("jwt"))
  addAlbumImage(@Req() req: AuthUser, @Param("id") id: string, @Body() dto: AddProfileAlbumImageDto) {
    return this.profiles.addAlbumImage(req.user.userId, id, dto.url);
  }


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
    return this.posts.byAuthor(id, req.user?.userId, cursor, limit ? parseLimit(limit, 10) : undefined);
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

  @Get("follow-requests")
  @UseGuards(AuthGuard("jwt"))
  followRequests(@Req() req: AuthUser) {
    return this.follows.pendingFollowRequests(req.user.userId);
  }

  @Post("follow-requests/:id/accept")
  @UseGuards(AuthGuard("jwt"))
  acceptFollowRequest(@Req() req: AuthUser, @Param("id") id: string) {
    return this.follows.respondToFollowRequest(req.user.userId, id, true);
  }

  @Post("follow-requests/:id/decline")
  @UseGuards(AuthGuard("jwt"))
  declineFollowRequest(@Req() req: AuthUser, @Param("id") id: string) {
    return this.follows.respondToFollowRequest(req.user.userId, id, false);
  }

  @Get("users/:id/followers")
  followers(@Param("id") id: string) {
    return this.follows.followers(id);
  }

  @Get("users/:id/following")
  following(@Param("id") id: string) {
    return this.follows.following(id);
  }

  @Get("people/directory")
  @UseGuards(AuthGuard("jwt"))
  browsePeople(
    @Req() req: AuthUser,
    @Query("cursor") cursor?: string,
    @Query("limit") limit?: string
  ) {
    return this.follows.browsePeople(req.user.userId, cursor, limit ? parseLimit(limit, 10) : undefined);
  }

  @Get("people")
  @UseGuards(AuthGuard("jwt"))
  searchPeople(@Req() req: AuthUser, @Query("q") q = "") {
    return this.follows.searchPeople(req.user.userId, q);
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
