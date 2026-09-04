import { Module } from "@nestjs/common";
import { ChatGateway } from "./chat.gateway";
import { ThreadsController } from "./threads.controller";
import { ThreadsService } from "./threads.service";
import { ChatBotService } from "./chat-bot.service";
import { NotificationRelayController } from "./notification-relay.controller";
import { InternalTokenGuard } from "../users/internal-token.guard";
import { SocialModule } from "../social/social.module";
import { AiModule } from "../ai/ai.module";

@Module({
  imports: [SocialModule, AiModule],
  controllers: [ThreadsController, NotificationRelayController],
  providers: [ChatGateway, ThreadsService, ChatBotService, InternalTokenGuard],
})
export class ChatModule {}
