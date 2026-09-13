import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";

export const ROLES_KEY = "roles";

const CANONICAL_ROLES = new Set([
  "ADMIN",
  "INVENTORY_MANAGER",
  "SELLER",
  "CONTENT_EDITOR",
  "CUSTOMER",
  "BANNED",
]);

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()]
    );

    if (!requiredRoles?.length) {
      return true;
    }

    // Roles come from the JWT payload, which Nest can deserialize under
    // different loaders. Canonicalize to the supported claim set so a
    // casing/typo/poisoned-claim edge case cannot accidentally satisfy a
    // guard that was intended to be exclusive.
    const user = context.switchToHttp().getRequest().user;
    if (!user || typeof user.role !== "string") {
      return false;
    }

    const normalized = user.role.trim().toUpperCase();
    if (!CANONICAL_ROLES.has(normalized)) {
      return false;
    }

    return requiredRoles.some(
      (role) => role.trim().toUpperCase() === normalized
    );
  }
}
