import { Module } from "@nestjs/common";
import { AiController } from "./ai.controller";
import { AiService } from "./ai.service";
import { SearchModule } from "../search/search.module";
import { ArticlesModule } from "../articles/articles.module";

@Module({
  imports: [SearchModule, ArticlesModule],
  controllers: [AiController],
  providers: [AiService],
  exports: [AiService],
})
export class AiModule {}