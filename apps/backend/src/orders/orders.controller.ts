import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  UseGuards,
  Req,
  NotFoundException,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";
import { OrdersService } from "./orders.service";
import { UpdateOrderStatusDto } from "./dto/update-status.dto";

@Controller("orders")
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post("checkout")
  @UseGuards(AuthGuard("jwt"))
  checkout(@Req() req: { user: { userId: string } }) {
    return this.ordersService.checkout(req.user.userId);
  }

  @Get()
  @UseGuards(AuthGuard("jwt"))
  findMyOrders(@Req() req: { user: { userId: string } }) {
    return this.ordersService.findByUser(req.user.userId);
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
    @Req() req: { user: { userId: string; role?: string } },
    @Param("id") id: string
  ) {
    const order = await this.ordersService.findOne(id);
    if (order.userId !== req.user.userId && req.user.role !== "ADMIN") {
      throw new NotFoundException("Order not found");
    }
    return order;
  }

  @Patch(":id/cancel")
  @UseGuards(AuthGuard("jwt"))
  cancel(@Req() req: { user: { userId: string } }, @Param("id") id: string) {
    return this.ordersService.cancelMine(id, req.user.userId);
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
    @Req() req: { user: { userId: string } },
    @Param("id") id: string,
    @Body() dto: UpdateOrderStatusDto
  ) {
    return this.ordersService.updateSellerStatus(id, req.user.userId, dto.status);
  }
}
