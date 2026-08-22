import { Module } from "@nestjs/common";
import { ChatGateway } from "./chat.gateway";
import { ThreadsController } from "./threads.controller";
import { ThreadsService } from "./threads.service";
import { SocialModule } from "../social/social.module";

@Module({
  imports: [SocialModule],
  controllers: [ThreadsController],
  providers: [ChatGateway, ThreadsService],
})
export class ChatModule {}
