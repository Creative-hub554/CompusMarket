import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  UseGuards,
  Req,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";
import { ArticlesService } from "./articles.service";
import { ArticleCategory } from "@theo/database";

@Controller("articles")
export class ArticlesController {
  constructor(private readonly articlesService: ArticlesService) {}

  @Post()
  @UseGuards(AuthGuard("jwt"), RolesGuard)
  @Roles("ADMIN", "CONTENT_EDITOR")
  create(
    @Req() req: { user: { userId: string } },
    @Body()
    body: {
      title: string;
      slug: string;
      content: string;
      excerpt?: string;
      category: ArticleCategory;
      tags?: string[];
    }
  ) {
    return this.articlesService.create({
      ...body,
      authorId: req.user.userId,
    });
  }

  @Get()
  findAll() {
    return this.articlesService.findAllPublished();
  }

  @Get("all")
  @UseGuards(AuthGuard("jwt"), RolesGuard)
  @Roles("ADMIN", "CONTENT_EDITOR")
  findAllAdmin() {
    return this.articlesService.findAll();
  }

  @Get("category/:category")
  findByCategory(@Param("category") category: ArticleCategory) {
    return this.articlesService.findByCategory(category);
  }

  @Get(":slug")
  findBySlug(@Param("slug") slug: string) {
    return this.articlesService.findBySlug(slug);
  }

  @Patch(":id")
  @UseGuards(AuthGuard("jwt"), RolesGuard)
  @Roles("ADMIN", "CONTENT_EDITOR")
  update(
    @Param("id") id: string,
    @Body()
    body: Partial<{
      title: string;
      content: string;
      excerpt: string;
      category: ArticleCategory;
      tags: string[];
      published: boolean;
    }>
  ) {
    return this.articlesService.update(id, body);
  }
}
