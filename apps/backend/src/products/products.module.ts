import { Module } from "@nestjs/common";
import { ProductsController } from "./products.controller";
import { ProductsService } from "./products.service";
import { SearchModule } from "../search/search.module";
import { JwtOrClerkGuard } from "../auth/jwt-or-clerk.guard";

@Module({
  imports: [SearchModule],
  controllers: [ProductsController],
  providers: [ProductsService, JwtOrClerkGuard],
  exports: [ProductsService],
})
export class ProductsModule {}
