import { Module } from "@nestjs/common";
import { APP_FILTER } from "@nestjs/core";
import { MulterModule } from "@nestjs/platform-express";
import { memoryStorage } from "multer";
import { PrismaModule } from "./prisma/prisma.module";
import { PrismaExceptionFilter } from "./common/prisma-exception.filter";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { AuthModule } from "./auth/auth.module";
import { ProductsModule } from "./products/products.module";
import { CategoriesModule } from "./categories/categories.module";
import { UploadModule } from "./upload/upload.module";
import { ResumesModule } from "./resumes/resumes.module";
import { ArticlesModule } from "./articles/articles.module";
import { CartModule } from "./cart/cart.module";
import { OrdersModule } from "./orders/orders.module";
import { WarrantiesModule } from "./warranties/warranties.module";
import { SearchModule } from "./search/search.module";
import { AiModule } from "./ai/ai.module";
import { ChatModule } from "./chat/chat.module";
import { SocialModule } from "./social/social.module";
import { DocumentsModule } from "./documents/documents.module";
import { DiagramsModule } from "./diagrams/diagrams.module";
import { FlashcardsModule } from "./flashcards/flashcards.module";
import { QuizzesModule } from "./quizzes/quizzes.module";
import { NotesModule } from "./notes/notes.module";
import { HealthModule } from "./health/health.module";

@Module({
  imports: [
    MulterModule.register({ storage: memoryStorage() }),
    PrismaModule,
    AuthModule,
    ProductsModule,
    CategoriesModule,
    UploadModule,
    ResumesModule,
    ArticlesModule,
    CartModule,
    OrdersModule,
    WarrantiesModule,
SearchModule,
    AiModule,
    ChatModule,
    SocialModule,
    DocumentsModule,
    DiagramsModule,
    FlashcardsModule,
    QuizzesModule,
    NotesModule,
    HealthModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_FILTER, useClass: PrismaExceptionFilter },
  ],
})
export class AppModule {}
