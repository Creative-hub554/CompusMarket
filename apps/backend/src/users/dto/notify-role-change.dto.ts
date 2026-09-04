import { IsIn, IsOptional, IsString, MaxLength } from "class-validator";
import { Role } from "@theo/database";
import { ROLE_CHANGE_REASON_MAX } from "../users.service";

/**
 * A role change that happened outside the app (a Clerk-dashboard ban): the
 * audit row was already written by the caller, so the backend only needs enough
 * to resolve a readable target and alert the configured ops channels.
 */
export class NotifyRoleChangeDto {
  @IsString()
  targetId!: string;

  @IsIn(Object.values(Role))
  fromRole!: string;

  @IsIn(Object.values(Role))
  toRole!: string;

  @IsOptional()
  @IsString()
  @MaxLength(ROLE_CHANGE_REASON_MAX)
  reason?: string;
}
