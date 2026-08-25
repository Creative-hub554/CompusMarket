import { Module } from "@nestjs/common";
import { SocialModule } from "../social/social.module";
import { JobsController } from "./jobs.controller";
import { JobsService } from "./jobs.service";

@Module({
  controllers: [JobsController],
  providers: [JobsService],
  imports: [SocialModule],
})
export class JobsModule {}
