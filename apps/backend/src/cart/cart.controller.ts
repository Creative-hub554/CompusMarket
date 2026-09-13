import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { CartService } from "./cart.service";
import { AddItemDto } from "./dto/add-item.dto";
import { UpdateItemDto } from "./dto/update-item.dto";
import { CurrentUserId } from "../common/current-user.decorator";

@Controller("cart")
@UseGuards(AuthGuard("jwt"))
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get()
  getCart(@CurrentUserId() userId: string) {
    return this.cartService.getCart(userId);
  }

  @Post("items")
  addItem(@CurrentUserId() userId: string, @Body() dto: AddItemDto) {
    return this.cartService.addItem(
      userId,
      dto.productId,
      dto.quantity
    );
  }

  @Patch("items/:itemId")
  updateItem(
    @CurrentUserId() userId: string,
    @Param("itemId") itemId: string,
    @Body() dto: UpdateItemDto
  ) {
    return this.cartService.updateItem(
      userId,
      itemId,
      dto.quantity
    );
  }

  @Delete("items/:itemId")
  removeItem(@CurrentUserId() userId: string, @Param("itemId") itemId: string) {
    return this.cartService.removeItem(userId, itemId);
  }

  @Delete()
  clearCart(@CurrentUserId() userId: string) {
    return this.cartService.clearCart(userId);
  }
}
