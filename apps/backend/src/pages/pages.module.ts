import { Module, forwardRef } from "@nestjs/common";
import { SocialModule } from "../social/social.module";
import { PagesController } from "./pages.controller";
import { PagesService } from "./pages.service";
import { PageBlockService } from "./page-block.service";

@Module({
  imports: [forwardRef(() => SocialModule)],
  controllers: [PagesController],
  providers: [PagesService, PageBlockService],
  exports: [PageBlockService],
})
export class PagesModule {}
