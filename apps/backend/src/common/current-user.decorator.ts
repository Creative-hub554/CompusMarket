import { createParamDecorator, ExecutionContext, UnauthorizedException } from "@nestjs/common";

/** Shape of `req.user` as populated by JwtStrategy (see auth/jwt.strategy.ts). */
export interface AuthenticatedUser {
  userId: string;
  email: string;
  role: string;
}

/**
 * Injects the authenticated user (populated by JwtStrategy) from the request.
 *
 * `@CurrentUser()` returns the whole `{ userId, email, role }` object;
 * `@CurrentUser("role")` returns a single field; `@CurrentUserId()` is a
 * shorthand for the id string.
 */
export const CurrentUser = createParamDecorator(
  (property: keyof AuthenticatedUser | undefined, ctx: ExecutionContext) => {
    const user = ctx.switchToHttp().getRequest<{ user?: AuthenticatedUser }>().user;
    if (!user) throw new UnauthorizedException();
    return property ? user[property] : user;
  },
);

/** Shorthand for `@CurrentUser("userId")`. */
export const CurrentUserId = (): ParameterDecorator => CurrentUser("userId");