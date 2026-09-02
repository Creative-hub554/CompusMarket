import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Delete,
  Body,
  UseGuards,
} from "@nestjs/common";
import { CategoriesService } from "./categories.service";
import { AuthGuard } from "@nestjs/passport";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";
import { CreateCategoryDto } from "./dto/create-category.dto";
import { UpdateCategoryDto } from "./dto/update-category.dto";

@Controller("categories")
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Post()
  @UseGuards(AuthGuard("jwt"), RolesGuard)
  @Roles("ADMIN")
  create(@Body() dto: CreateCategoryDto) {
    return this.categoriesService.create(dto.name, dto.slug);
  }

  @Get()
  findAll() {
    return this.categoriesService.findAll();
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.categoriesService.findOne(id);
  }

  @Patch(":id")
  @UseGuards(AuthGuard("jwt"), RolesGuard)
  @Roles("ADMIN")
  update(@Param("id") id: string, @Body() dto: UpdateCategoryDto) {
    return this.categoriesService.update(id, dto);
  }

  @Post("seed")
  @UseGuards(AuthGuard("jwt"), RolesGuard)
  @Roles("ADMIN")
  seed() {
    return this.categoriesService.seed();
  }

  @Delete(":id")
  @UseGuards(AuthGuard("jwt"), RolesGuard)
  @Roles("ADMIN")
  remove(@Param("id") id: string) {
    return this.categoriesService.remove(id);
  }
}
