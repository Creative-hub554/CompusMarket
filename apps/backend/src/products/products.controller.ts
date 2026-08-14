import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Query,
  Delete,
  UseGuards,
} from "@nestjs/common";
import { ProductsService } from "./products.service";
import { CreateProductDto } from "./dto/create-product.dto";
import { UpdateProductDto } from "./dto/update-product.dto";
import { AuthGuard } from "@nestjs/passport";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";

@Controller("products")
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  @UseGuards(AuthGuard("jwt"), RolesGuard)
  @Roles("ADMIN", "INVENTORY_MANAGER")
  create(@Body() createProductDto: CreateProductDto) {
    return this.productsService.create(createProductDto);
  }

  @Get()
  findAll(@Query("inStock") inStock?: string) {
    return this.productsService.findAll(inStock === "true");
  }

  @Get("admin/:id")
  @UseGuards(AuthGuard("jwt"), RolesGuard)
  @Roles("ADMIN", "INVENTORY_MANAGER")
  findOneAdmin(@Param("id") id: string) {
    return this.productsService.findOneAdmin(id);
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.productsService.findOne(id);
  }

  @Get("category/:slug")
  findByCategory(@Param("slug") slug: string, @Query("inStock") inStock?: string) {
    return this.productsService.findByCategory(slug, inStock === "true");
  }

  @Patch(":id")
  @UseGuards(AuthGuard("jwt"), RolesGuard)
  @Roles("ADMIN", "INVENTORY_MANAGER")
  update(@Param("id") id: string, @Body() updateProductDto: UpdateProductDto) {
    return this.productsService.update(id, updateProductDto);
  }

  @Delete(":id")
  @UseGuards(AuthGuard("jwt"), RolesGuard)
  @Roles("ADMIN")
  remove(@Param("id") id: string) {
    return this.productsService.remove(id);
  }
}
