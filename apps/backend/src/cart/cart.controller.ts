import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  Req,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { CartService } from "./cart.service";
import { AddItemDto } from "./dto/add-item.dto";
import { UpdateItemDto } from "./dto/update-item.dto";

@Controller("cart")
@UseGuards(AuthGuard("jwt"))
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get()
  getCart(@Req() req: { user: { userId: string } }) {
    return this.cartService.getCart(req.user.userId);
  }

  @Post("items")
  addItem(
    @Req() req: { user: { userId: string } },
    @Body() dto: AddItemDto
  ) {
    return this.cartService.addItem(
      req.user.userId,
      dto.productId,
      dto.quantity
    );
  }

  @Patch("items/:itemId")
  updateItem(
    @Req() req: { user: { userId: string } },
    @Param("itemId") itemId: string,
    @Body() dto: UpdateItemDto
  ) {
    return this.cartService.updateItem(
      req.user.userId,
      itemId,
      dto.quantity
    );
  }

  @Delete("items/:itemId")
  removeItem(
    @Req() req: { user: { userId: string } },
    @Param("itemId") itemId: string
  ) {
    return this.cartService.removeItem(req.user.userId, itemId);
  }

  @Delete()
  clearCart(@Req() req: { user: { userId: string } }) {
    return this.cartService.clearCart(req.user.userId);
  }
}
