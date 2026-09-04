import { Body, Controller, Param, Patch, UseGuards } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";
import { UsersService } from "./users.service";
import { UpdateUserRoleDto } from "./dto/update-user-role.dto";

@Controller("admin/users")
@UseGuards(AuthGuard("jwt"), RolesGuard)
export class UsersController {
  constructor(private usersService: UsersService) {}

  /** Promote/demote a user, or ban/unban by setting BANNED / another role. */
  @Patch(":id/role")
  @Roles("ADMIN")
  setRole(@Param("id") id: string, @Body() dto: UpdateUserRoleDto) {
    return this.usersService.setRole(id, dto.role);
  }
}