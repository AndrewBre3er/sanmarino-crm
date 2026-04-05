import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { get_env } from "../../config/env";
import { read_cookie, type CookieRequestLike } from "./auth.cookies";
import {
  resolve_auth_access_requirements,
  auth_access_metadata_key,
  type AuthAccessRequirements
} from "./auth.access.contract";
import type { AuthenticatedRequestLike } from "./auth.access.helpers";
import { AuthService } from "./auth.service";

interface AuthAccessRequest extends CookieRequestLike, AuthenticatedRequestLike {
  headers: CookieRequestLike["headers"];
}

function to_unauthorized(message: string): UnauthorizedException {
  return new UnauthorizedException({
    code: "ACCESS_DENIED",
    message
  });
}

function to_forbidden(message: string): ForbiddenException {
  return new ForbiddenException({
    code: "ACCESS_FORBIDDEN",
    message
  });
}

@Injectable()
export class AuthAccessGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly authService: AuthService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (context.getType<string>() !== "http") {
      return true;
    }

    const requirements = this.reflector.getAllAndOverride<AuthAccessRequirements | undefined>(
      auth_access_metadata_key,
      [context.getHandler(), context.getClass()]
    );
    const resolved = resolve_auth_access_requirements(requirements);

    if (!resolved.requireAuthenticated) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthAccessRequest>();
    const accessCookieName = get_env().AUTH_COOKIE_ACCESS_NAME;
    const accessToken = read_cookie(request, accessCookieName);
    if (!accessToken) {
      throw to_unauthorized(`Cookie '${accessCookieName}' is missing`);
    }

    let currentAccess: NonNullable<AuthAccessRequest["auth"]>;
    try {
      currentAccess = await this.authService.get_current_user(accessToken);
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      throw to_unauthorized("Authentication is required");
    }

    request.auth = currentAccess;

    if (resolved.requiredRoleCodes.length > 0) {
      const userRoleCodes = new Set(currentAccess.user.roleCodes);
      const hasRequiredRole = resolved.requiredRoleCodes.some((roleCode) => userRoleCodes.has(roleCode));
      if (!hasRequiredRole) {
        throw to_forbidden("Required role is missing");
      }
    }

    if (resolved.requiredPermissionCodes.length > 0) {
      const userPermissionCodes = new Set(currentAccess.user.permissionCodes);
      const missingPermission = resolved.requiredPermissionCodes.find(
        (permissionCode) => !userPermissionCodes.has(permissionCode)
      );
      if (missingPermission) {
        throw to_forbidden("Required permission is missing");
      }
    }

    return true;
  }
}
