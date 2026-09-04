import { IsIn, IsOptional, IsString } from "class-validator";
import { NotificationKind } from "@theo/database";

// Runtime values of the Prisma enum — only known kinds are ever relayed.
const KINDS = Object.values(NotificationKind);

export class DeliverNotificationDto {
  @IsString()
  userId!: string;

  /** The acting user (e.g. the admin who resolved a report). */
  @IsString()
  actorId!: string;

  @IsIn(KINDS)
  kind!: (typeof KINDS)[number];

  @IsOptional()
  @IsString()
  entityId?: string;

  @IsOptional()
  @IsString()
  message?: string;
}
