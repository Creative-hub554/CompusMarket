import { Module } from "@nestjs/common";
import { SocialModule } from "../social/social.module";
import { PagesController } from "./pages.controller";
import { PagesService } from "./pages.service";

@Module({
  imports: [SocialModule],
  controllers: [PagesController],
  providers: [PagesService],
})
export class PagesModule {}
