import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  UseGuards,
  NotFoundException,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";
import { OrdersService } from "./orders.service";
import { UpdateOrderStatusDto } from "./dto/update-status.dto";
import { CurrentUser, CurrentUserId } from "../common/current-user.decorator";

@Controller("orders")
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post("checkout")
  @UseGuards(AuthGuard("jwt"))
  checkout(@CurrentUserId() userId: string) {
    return this.ordersService.checkout(userId);
  }

  @Get()
  @UseGuards(AuthGuard("jwt"))
  findMyOrders(@CurrentUserId() userId: string) {
    return this.ordersService.findByUser(userId);
  }

  @Get("all")
  @UseGuards(AuthGuard("jwt"), RolesGuard)
  @Roles("ADMIN")
  findAll() {
    return this.ordersService.findAll();
  }

  @Get(":id")
  @UseGuards(AuthGuard("jwt"))
  async findOne(
    @CurrentUser() user: { userId: string; role: string },
    @Param("id") id: string
  ) {
    const order = await this.ordersService.findOne(id);
    if (order.userId !== user.userId && user.role !== "ADMIN") {
      throw new NotFoundException("Order not found");
    }
    return order;
  }

  @Patch(":id/cancel")
  @UseGuards(AuthGuard("jwt"))
  cancel(@CurrentUserId() userId: string, @Param("id") id: string) {
    return this.ordersService.cancelMine(id, userId);
  }

  @Patch(":id/status")
  @UseGuards(AuthGuard("jwt"), RolesGuard)
  @Roles("ADMIN")
  updateStatus(
    @Param("id") id: string,
    @Body() dto: UpdateOrderStatusDto
  ) {
    return this.ordersService.updateStatus(id, dto.status);
  }

  @Patch(":id/seller-status")
  @UseGuards(AuthGuard("jwt"))
  updateSellerStatus(
    @CurrentUserId() userId: string,
    @Param("id") id: string,
    @Body() dto: UpdateOrderStatusDto
  ) {
    return this.ordersService.updateSellerStatus(id, userId, dto.status);
  }
}
