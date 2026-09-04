import { Body, Controller, HttpCode, Post, UseGuards } from "@nestjs/common";
import { UsersService } from "./users.service";
import { NotifyRoleChangeDto } from "./dto/notify-role-change.dto";
import { InternalTokenGuard } from "./internal-token.guard";

/**
 * Backend-internal endpoints for other first-party services (the Next.js app's
 * Clerk-webhook route), guarded by the shared INTERNAL_SERVICE_TOKEN.
 */
@Controller("internal/role-changes")
@UseGuards(InternalTokenGuard)
export class InternalUsersController {
  constructor(private usersService: UsersService) {}

  /**
   * Alert ops channels about a role change that originated outside the app (a
   * Clerk-dashboard ban). The caller already wrote the audit row; this only
   * resolves the target and pushes the Slack/Telegram notice.
   */
  @Post("notify")
  @HttpCode(204)
  async notify(@Body() dto: NotifyRoleChangeDto) {
    await this.usersService.notifyExternalChange(dto);
  }
}
