import { Module } from "@nestjs/common";
import { SocialController } from "./social.controller";
import { PostsService } from "./posts.service";
import { FollowsService } from "./follows.service";
import { StoriesService } from "./stories.service";
import { ProfilesService } from "./profiles.service";
import { NotificationsService } from "./notifications.service";

@Module({
  controllers: [SocialController],
  providers: [PostsService, FollowsService, StoriesService, ProfilesService, NotificationsService],
  exports: [NotificationsService],
})
export class SocialModule {}
