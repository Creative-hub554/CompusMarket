import { Body, Controller, Get, Param, Patch, Query, UseGuards } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";
import { UsersService } from "./users.service";
import { UpdateUserRoleDto } from "./dto/update-user-role.dto";

@Controller("admin/users")
@UseGuards(AuthGuard("jwt"), RolesGuard)
export class UsersController {
  constructor(private usersService: UsersService) {}

  /** Directory for the admin user-management page (search + pagination). */
  @Get()
  @Roles("ADMIN")
  list(
    @Query("q") q?: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string
  ) {
    return this.usersService.list({
      q,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  /** Promote/demote a user, or ban/unban by setting BANNED / another role. */
  @Patch(":id/role")
  @Roles("ADMIN")
  setRole(@Param("id") id: string, @Body() dto: UpdateUserRoleDto) {
    return this.usersService.setRole(id, dto.role);
  }
}