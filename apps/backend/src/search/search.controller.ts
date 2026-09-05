import { Controller, Get, Query, Post, UseGuards, BadRequestException } from "@nestjs/common";
import { SearchService } from "./search.service";
import { AuthGuard } from "@nestjs/passport";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";

@Controller("search")
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  async search(
    @Query("q") query: string,
    @Query("categoryId") categoryId?: string,
    @Query("minPrice") minPrice?: string,
    @Query("maxPrice") maxPrice?: string,
    @Query("condition") condition?: string,
    @Query("sort") sort?: string,
    @Query("inStock") inStock?: string,
  ) {
    const parsedMin = minPrice ? Number(minPrice) : undefined;
    const parsedMax = maxPrice ? Number(maxPrice) : undefined;
    if (
      (parsedMin !== undefined && !Number.isFinite(parsedMin)) ||
      (parsedMax !== undefined && !Number.isFinite(parsedMax))
    ) {
      throw new BadRequestException("minPrice and maxPrice must be valid numbers");
    }
    return this.searchService.search(query || "", {
      categoryId,
      minPrice: parsedMin,
      maxPrice: parsedMax,
      condition,
      sort,
      inStock: inStock === "true",
    });
  }

  @Post("reindex")
  @UseGuards(AuthGuard("jwt"), RolesGuard)
  @Roles("ADMIN")
  async reindex() {
    await this.searchService.reindexAll();
    return { message: "Reindex started" };
  }
}