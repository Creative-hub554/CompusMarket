import { Module } from "@nestjs/common";
import { AdsService } from "./ads.service";
import { AdsController } from "./ads.controller";
import { PrismaModule } from "../prisma/prisma.module";
import { StripeService } from "./stripe.service";

@Module({
  imports: [PrismaModule],
  providers: [AdsService, StripeService],
  controllers: [AdsController],
  exports: [AdsService],
})
export class AdsModule {}
