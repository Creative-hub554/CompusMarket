import { IsEnum } from "class-validator";
import { OrderStatus } from "@theo/database";

export class UpdateOrderStatusDto {
  @IsEnum(OrderStatus)
  status!: OrderStatus;
}