import { AuthGuard } from "@nestjs/passport";

export class OptionalJwtGuard extends AuthGuard("jwt") {
  handleRequest<TUser = unknown>(err: unknown, user: unknown): TUser {
    // Never fail: anonymous visitors simply get no user context.
    if (err || !user) {
      return undefined as TUser;
    }
    return user as TUser;
  }
}
