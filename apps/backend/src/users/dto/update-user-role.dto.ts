import { IsEnum } from "class-validator";
import { Role } from "@theo/database";

/** New application role for a user. Setting BANNED bans; any other value unbans. */
export class UpdateUserRoleDto {
  @IsEnum(Role)
  role!: Role;
}