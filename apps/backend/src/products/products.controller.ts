import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Query,
  Delete,
  Req,
  UseGuards,
} from "@nestjs/common";
import { ProductsService } from "./products.service";
import { CreateProductDto } from "./dto/create-product.dto";
import { UpdateProductDto } from "./dto/update-product.dto";
import { CreateReviewDto } from "./dto/create-review.dto";
import { AuthGuard } from "@nestjs/passport";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";

type AuthedReq = { user: { userId: string } };

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

  @Get("promos")
  findPromos() {
    return this.productsService.findPromos();
  }

  @Get("browse")
  browse(
    @Query("category") category?: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string
  ) {
    return this.productsService.browse({
      category: category || undefined,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
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

  @Get(":id/reviewable")
  @UseGuards(AuthGuard("jwt"))
  getReviewable(@Req() req: AuthedReq, @Param("id") id: string) {
    return this.productsService.getReviewable(id, req.user.userId);
  }

  @Post(":id/reviews")
  @UseGuards(AuthGuard("jwt"))
  createReview(
    @Req() req: AuthedReq,
    @Param("id") id: string,
    @Body() dto: CreateReviewDto
  ) {
    return this.productsService.createReview(id, req.user.userId, dto);
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
