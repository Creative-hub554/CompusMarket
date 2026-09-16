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
import { JwtOrClerkGuard } from "../auth/jwt-or-clerk.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";
import { parseLimit } from "../common/pagination";

type AuthedReq = { user: { userId: string } };

@Controller("products")
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  @UseGuards(JwtOrClerkGuard, RolesGuard)
  @Roles("ADMIN", "INVENTORY_MANAGER")
  create(@Body() createProductDto: CreateProductDto) {
    return this.productsService.create(createProductDto);
  }

  @Get()
  findAll(@Query("inStock") inStock?: string, @Query("ids") ids?: string) {
    const idList = ids
      ? ids.split(",").map((s) => s.trim()).filter(Boolean)
      : undefined;
    return this.productsService.findAll(inStock === "true", idList);
  }

  @Get("promos")
  findPromos() {
    return this.productsService.findPromos();
  }

  @Get("shops")
  findShops() {
    return this.productsService.findShops();
  }

  @Get("storefront/:sellerId")
  findSellerStorefront(@Param("sellerId") sellerId: string) {
    return this.productsService.findSellerStorefront(sellerId);
  }

  @Get(":id/related")
  findRelated(@Param("id") id: string) {
    return this.productsService.findRelated(id);
  }

  @Get("browse")
  browse(
    @Query("category") category?: string,
    @Query("q") q?: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
    @Query("condition") condition?: string,
    @Query("minPrice") minPrice?: string,
    @Query("maxPrice") maxPrice?: string
  ) {
    const parsedMin = minPrice ? Number(minPrice) : undefined;
    const parsedMax = maxPrice ? Number(maxPrice) : undefined;
    return this.productsService.browse({
      category: category || undefined,
      q: q || undefined,
      page: page ? Number(page) : undefined,
      limit: limit ? parseLimit(limit, 12, 48) : undefined,
      condition: condition === "A" || condition === "B" || condition === "C" ? condition : undefined,
      minPrice: Number.isFinite(parsedMin) ? parsedMin : undefined,
      maxPrice: Number.isFinite(parsedMax) ? parsedMax : undefined,
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
  @UseGuards(JwtOrClerkGuard, RolesGuard)
  @Roles("ADMIN", "INVENTORY_MANAGER")
  update(@Param("id") id: string, @Body() updateProductDto: UpdateProductDto) {
    return this.productsService.update(id, updateProductDto);
  }

  @Delete(":id")
  @UseGuards(JwtOrClerkGuard, RolesGuard)
  @Roles("ADMIN")
  remove(@Param("id") id: string) {
    return this.productsService.remove(id);
  }
}
