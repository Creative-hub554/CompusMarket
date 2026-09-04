import { IsEnum, IsOptional, IsString, MaxLength } from "class-validator";
import { Role } from "@theo/database";
import { ROLE_CHANGE_REASON_MAX } from "../users.service";

/** New application role for a user. Setting BANNED bans; any other value unbans. */
export class UpdateUserRoleDto {
  @IsEnum(Role)
  role!: Role;

  /** Why the change is being made (shown in the audit trail; required context for bans). */
  @IsOptional()
  @IsString()
  @MaxLength(ROLE_CHANGE_REASON_MAX)
  reason?: string;
}
