import { Module } from "@nestjs/common";
import { MulterModule } from "@nestjs/platform-express";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { AuthModule } from "./auth/auth.module";
import { ProductsModule } from "./products/products.module";
import { CategoriesModule } from "./categories/categories.module";
import { UploadModule } from "./upload/upload.module";

@Module({
  imports: [
    MulterModule.register({ dest: "./uploads" }),
    AuthModule,
    ProductsModule,
    CategoriesModule,
    UploadModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
