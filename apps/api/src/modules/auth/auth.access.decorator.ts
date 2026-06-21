import { SetMetadata } from "@nestjs/common";
import type { AuthRoleCode } from "./auth.contract";
import { auth_access_metadata_key, type AuthAccessRequirements } from "./auth.access.contract";

export function require_access(
  requirements: AuthAccessRequirements = { authenticated: true }
): MethodDecorator & ClassDecorator {
  return SetMetadata(auth_access_metadata_key, requirements);
}

export function authenticated_only(): MethodDecorator & ClassDecorator {
  return require_access({ authenticated: true });
}

export function require_roles(...roleCodes: AuthRoleCode[]): MethodDecorator & ClassDecorator {
  return require_access({
    authenticated: true,
    requiredRoleCodes: roleCodes
  });
}

export function require_permissions(...permissionCodes: string[]): MethodDecorator & ClassDecorator {
  return require_access({
    authenticated: true,
    requiredPermissionCodes: permissionCodes
  });
}
