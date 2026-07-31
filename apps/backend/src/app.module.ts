import { Module } from "@nestjs/common";
import { MulterModule } from "@nestjs/platform-express";
import { PrismaModule } from "./prisma/prisma.module";
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
import { DocumentsModule } from "./documents/documents.module";
import { DiagramsModule } from "./diagrams/diagrams.module";
import { FlashcardsModule } from "./flashcards/flashcards.module";
import { QuizzesModule } from "./quizzes/quizzes.module";
import { NotesModule } from "./notes/notes.module";
import { HealthModule } from "./health/health.module";

@Module({
  imports: [
    MulterModule.register({ dest: "./uploads" }),
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
    DocumentsModule,
    DiagramsModule,
    FlashcardsModule,
    QuizzesModule,
    NotesModule,
    HealthModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
