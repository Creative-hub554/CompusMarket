import { Controller, Get, Query, Post, UseGuards } from "@nestjs/common";
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
  ) {
    return this.searchService.search(query || "", {
      categoryId,
      minPrice: minPrice ? Number(minPrice) : undefined,
      maxPrice: maxPrice ? Number(maxPrice) : undefined,
      condition,
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