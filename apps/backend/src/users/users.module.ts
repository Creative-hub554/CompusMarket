import { Module } from "@nestjs/common";
import { UsersController } from "./users.controller";
import { InternalUsersController } from "./internal-users.controller";
import { UsersService } from "./users.service";
import { InternalTokenGuard } from "./internal-token.guard";

@Module({
  controllers: [UsersController, InternalUsersController],
  providers: [UsersService, InternalTokenGuard],
})
export class UsersModule {}
