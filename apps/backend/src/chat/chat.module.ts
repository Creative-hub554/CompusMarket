import { Module } from "@nestjs/common";
import { ChatGateway } from "./chat.gateway";
import { ThreadsController } from "./threads.controller";
import { ThreadsService } from "./threads.service";
import { ChatBotService } from "./chat-bot.service";
import { SocialModule } from "../social/social.module";
import { AiModule } from "../ai/ai.module";

@Module({
  imports: [SocialModule, AiModule],
  controllers: [ThreadsController],
  providers: [ChatGateway, ThreadsService, ChatBotService],
})
export class ChatModule {}
